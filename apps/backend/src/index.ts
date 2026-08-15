import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
	AddTransactionUseCase,
	GetPortfolioSummaryUseCase,
	GetPortfolioEvolutionUseCase,
	CheckPriceAlertsUseCase,
	Transaction,
	TransactionType,
	PriceAlert,
	ASSET_DICTIONARY,
} from "@equilibrio/core";
import { PrismaTransactionRepository } from "./repositories/PrismaTransactionRepository";
import { PrismaPriceAlertRepository } from "./repositories/PrismaPriceAlertRepository";
import { YahooFinanceService } from "./services/YahooFinanceService";
import { DolarApiService } from "./services/DolarApiService";
import { tickerValidationService } from "./services/TickerValidationService";
import { startPriceAlertsCronJob } from "./jobs/priceAlertsJob";

const JWT_SECRET = process.env.JWT_SECRET ?? "equilibrio-super-secret-key-2026";
const JWT_EXPIRES_IN = "7d";

// Extend Express Request to carry authenticated user info
declare global {
	namespace Express {
		interface Request {
			authUser?: { userId: string; displayName: string };
		}
	}
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
	const authHeader = req.headers.authorization;
	if (!authHeader?.startsWith("Bearer ")) {
		res.status(401).json({ message: "No autenticado" });
		return;
	}
	const token = authHeader.slice(7);
	try {
		const payload = jwt.verify(token, JWT_SECRET) as { userId: string; displayName: string };
		req.authUser = payload;
		next();
	} catch {
		res.status(401).json({ message: "Token inválido o expirado" });
	}
}

const app = express();
const port = 3001;

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/equilibrio";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const transactionRepository = new PrismaTransactionRepository(prisma);
const priceAlertRepository = new PrismaPriceAlertRepository(prisma);
const addTransactionUseCase = new AddTransactionUseCase(transactionRepository);
const marketDataService = new YahooFinanceService();
const currencyService = new DolarApiService();
const getPortfolioSummaryUseCase = new GetPortfolioSummaryUseCase(
	transactionRepository,
	marketDataService,
	currencyService,
);
const getPortfolioEvolutionUseCase = new GetPortfolioEvolutionUseCase(
	transactionRepository,
	marketDataService,
);
const checkPriceAlertsUseCase = new CheckPriceAlertsUseCase(
	priceAlertRepository,
	marketDataService,
);

// Iniciar cron job para verificar alertas de precio (no ejecutar en tests)
if (process.env.NODE_ENV !== 'test') {
	startPriceAlertsCronJob(checkPriceAlertsUseCase, io);
}

const parsePositiveInteger = (value: unknown, fallback: number): number => {
	if (typeof value !== "string") {
		return fallback;
	}

	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return fallback;
	}

	return parsed;
};

const parseSortBy = (value: unknown): "date" | "price" | "quantity" => {
	if (value === "price" || value === "quantity" || value === "date") {
		return value;
	}

	return "date";
};

const parseSortOrder = (value: unknown): "asc" | "desc" => {
	if (value === "asc" || value === "desc") {
		return value;
	}

	return "desc";
};

type AssetType = "CEDEAR" | "ACCION_LOCAL";

const parseAssetType = (value: unknown): AssetType => {
	if (value === "CEDEAR" || value === "ACCION_LOCAL") {
		return value;
	}

	return "ACCION_LOCAL";
};

app.use(cors());
app.use(express.json());

// ─── Auth routes (public) ────────────────────────────────────────────────────

const generateTokens = async (user: { id: string; displayName: string }) => {
	const accessToken = jwt.sign(
		{ userId: user.id, displayName: user.displayName },
		JWT_SECRET,
		{ expiresIn: "15m" }
	);
	
	const refreshToken = randomUUID() + randomUUID();
	const hashedToken = bcrypt.hashSync(refreshToken, 10);
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
	
	await prisma.refreshToken.create({
		data: {
			id: randomUUID(),
			userId: user.id,
			hashedToken,
			expiresAt,
			createdAt: new Date(),
		}
	});

	return { accessToken, refreshToken };
};

app.post("/api/auth/login", async (req: Request, res: Response) => {
	try {
		const { username, password } = req.body as { username?: string; password?: string };

		if (!username || !password) {
			return res.status(400).json({ message: "Usuario y contraseña requeridos" });
		}

		const user = await prisma.user.findUnique({ where: { username } });

		if (!user || !user.passwordHash) {
			return res.status(401).json({ message: "Credenciales inválidas" });
		}

		const passwordMatch = await bcrypt.compare(password, user.passwordHash);
		if (!passwordMatch) {
			return res.status(401).json({ message: "Credenciales inválidas" });
		}

		const tokens = await generateTokens(user);

		return res.json({
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			userId: user.id,
			displayName: user.displayName,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(500).json({ message });
	}
});

app.post("/api/auth/google", async (req: Request, res: Response) => {
	try {
		const { email, displayName, googleId } = req.body as { email?: string; displayName?: string; googleId?: string };

		if (!email || !displayName || !googleId) {
			return res.status(400).json({ message: "Datos incompletos de Google" });
		}

		let user = await prisma.user.findUnique({ where: { email } });

		if (!user) {
			user = await prisma.user.create({
				data: {
					id: randomUUID(),
					username: email,
					email,
					googleId,
					passwordHash: "",
					displayName,
					createdAt: new Date(),
				}
			});
		} else {
			user = await prisma.user.update({
				where: { email },
				data: { googleId }
			});
		}

		const tokens = await generateTokens(user);

		return res.json({
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			userId: user.id,
			displayName: user.displayName,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(500).json({ message });
	}
});

app.post("/api/auth/refresh", async (req: Request, res: Response) => {
	try {
		const { refreshToken } = req.body as { refreshToken?: string };
		if (!refreshToken) {
			return res.status(400).json({ message: "Refresh token requerido" });
		}

		const activeTokens = await prisma.refreshToken.findMany({
			where: {
				revoked: false,
				expiresAt: { gt: new Date() }
			}
		});

		let validToken = null;
		for (const t of activeTokens) {
			if (await bcrypt.compare(refreshToken, t.hashedToken)) {
				validToken = t;
				break;
			}
		}

		if (!validToken) {
			return res.status(401).json({ message: "Refresh token inválido o expirado" });
		}

		// Revoke the old token
		await prisma.refreshToken.update({
			where: { id: validToken.id },
			data: { revoked: true }
		});

		const user = await prisma.user.findUnique({ where: { id: validToken.userId } });
		
		if (!user) {
			return res.status(401).json({ message: "Usuario no encontrado" });
		}

		const tokens = await generateTokens(user);

		return res.json({
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(500).json({ message });
	}
});

app.get("/api/auth/me", requireAuth, (req: Request, res: Response) => {
	return res.json(req.authUser);
});

// ─── General routes ───────────────────────────────────────────────────────────

app.get("/", (_req: Request, res: Response) => {
	return res.json({
		message: "Bienvenido a la API de Equilibrio",
		status: "ok",
		docs: [
			"GET /health",
			"GET /api/transactions",
			"GET /api/transactions/:id",
			"GET /api/portfolio/:userId",
			"POST /api/transactions",
			"PUT /api/transactions/:id",
			"DELETE /api/transactions/:id",
		],
	});
});

app.get("/health", (_req: Request, res: Response) => {
	return res.json({
		status: "ok",
		service: "backend",
		timestamp: new Date().toISOString(),
	});
});

app.get("/api/exchange-rate", async (_req: Request, res: Response) => {
	try {
		const exchangeRateUsed = await currencyService.getExchangeRate("USDARS_MEP");

		return res.json({ exchangeRateUsed });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(400).json({ message });
	}
});

app.get("/api/market-price/:assetId", async (req: Request, res: Response) => {
	try {
		const assetIdRaw = Array.isArray(req.params.assetId) ? req.params.assetId[0] : req.params.assetId;
		const assetId = typeof assetIdRaw === "string" ? assetIdRaw.toUpperCase() : String(assetIdRaw).toUpperCase();
		const definition = ASSET_DICTIONARY[assetId];
		
		// If it's a CEDEAR, we return the USD price of the underlying ticker
		// Since the user wants to record CEDEAR purchases in USD.
		const tickerToFetch = definition?.type === "CEDEAR" ? definition.underlyingTicker : assetId;
		
		const price = await marketDataService.getCurrentPrice(tickerToFetch);

		if (price === null) {
			return res.status(404).json({ message: "No se pudo obtener el precio para el activo indicado" });
		}

		return res.json({ price });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(400).json({ message });
	}
});

app.get("/api/transactions", async (req: Request, res: Response) => {
	try {
		const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
		const assetId = typeof req.query.assetId === "string" ? req.query.assetId : undefined;
		const page = parsePositiveInteger(req.query.page, 1);
		const pageSize = parsePositiveInteger(req.query.pageSize, 10);
		const sortBy = parseSortBy(req.query.sortBy);
		const sortOrder = parseSortOrder(req.query.sortOrder);

		const result = await transactionRepository.findMany({
			userId,
			assetId,
			page,
			pageSize,
			sortBy,
			sortOrder,
		});

		const exchangeRate = await currencyService.getExchangeRate("USDARS_MEP");

		const uniqueAssets = Array.from(new Set(result.data.map((t) => t.assetId)));
		const currentPrices: Record<string, number> = {};
		for (const id of uniqueAssets) {
			const definition = ASSET_DICTIONARY[id];
			let price = null;

			if (definition?.type === "CEDEAR" && exchangeRate && definition.ratio > 0) {
				const underlyingPriceUSD = await marketDataService.getCurrentPrice(definition.underlyingTicker);
				if (underlyingPriceUSD !== null) {
					price = (underlyingPriceUSD * exchangeRate) / definition.ratio;
				}
			} else {
				price = await marketDataService.getCurrentPrice(id);
			}

			if (price !== null) {
				currentPrices[id] = price;
			}
		}

		const dataWithPrices = result.data.map((t) => ({
			id: t.id,
			userId: t.userId,
			assetId: t.assetId,
			assetType: t.assetType,
			type: t.type,
			date: t.date,
			quantity: t.quantity,
			price: t.price,
			commission: t.commission,
			currentMarketPrice: currentPrices[t.assetId] ?? null,
		}));

		return res.json({
			...result,
			data: dataWithPrices,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(400).json({ message });
	}
});

app.put("/api/transactions/:id", async (req: Request, res: Response) => {
	try {
		const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
		const {
			userId,
			assetId,
			assetType,
			type,
			date,
			quantity,
			price,
			commission,
		} = req.body;

		if (quantity <= 0) {
			return res.status(400).json({ message: "La cantidad debe ser mayor a cero." });
		}

		const existing = await transactionRepository.findById(id);
		if (!existing) {
			return res.status(404).json({ message: "Transaccion no encontrada" });
		}

		const transaction = new Transaction(
			id,
			userId,
			assetId,
			parseAssetType(assetType),
			type as TransactionType,
			new Date(date),
			quantity,
			price,
			commission,
		);

		await transactionRepository.updateById(id, transaction);
		return res.json(transaction);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(400).json({ message });
	}
});

app.get("/api/transactions/:id", async (req: Request, res: Response) => {
	try {
		const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
		const transaction = await transactionRepository.findById(id);

		if (!transaction) {
			return res.status(404).json({ message: "Transaccion no encontrada" });
		}

		return res.json(transaction);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(400).json({ message });
	}
});

app.get("/api/portfolio/:userId", async (req: Request, res: Response) => {
	try {
		const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
		const summary = await getPortfolioSummaryUseCase.execute(userId);

		return res.status(200).json(summary);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(400).json({ message });
	}
});

app.get("/api/portfolio/:userId/evolution", async (req: Request, res: Response) => {
	try {
		const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
		const evolution = await getPortfolioEvolutionUseCase.execute(userId);

		return res.status(200).json(evolution);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(400).json({ message });
	}
});

app.delete("/api/transactions/:id", async (req: Request, res: Response) => {
	try {
		const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
		const deleted = await transactionRepository.deleteById(id);

		if (!deleted) {
			return res.status(404).json({ message: "Transaccion no encontrada" });
		}

		return res.status(204).send();
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(400).json({ message });
	}
});

app.get("/api/tickers/suggested", (req: Request, res: Response) => {
	try {
		const tickers = tickerValidationService.getSuggestedTickers();
		return res.json(tickers);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(400).json({ message });
	}
});

app.post("/api/tickers/validate", async (req: Request, res: Response) => {
	try {
		const { ticker } = req.body;

		if (!ticker || typeof ticker !== "string") {
			return res.status(400).json({ message: "Ticker requerido" });
		}

		const isValid = await tickerValidationService.validateTicker(ticker);
		return res.json({ ticker: ticker.toUpperCase(), isValid });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(400).json({ message });
	}
});

app.post("/api/transactions", async (req: Request, res: Response) => {
	try {
		const {
			id,
			userId,
			assetId,
			assetType,
			type,
			date,
			quantity,
			price,
			commission,
		} = req.body;

		// Validar que el ticker existe
		const isValidTicker = await tickerValidationService.validateTicker(assetId);
		if (!isValidTicker) {
			return res.status(400).json({
				message: `El ticker "${assetId}" no es válido o no existe en Yahoo Finance. Usa tickers reales como MELI, AAPL, MSFT, etc.`,
			});
		}

		const transaction = await addTransactionUseCase.execute({
			id,
			userId,
			assetId,
			assetType: parseAssetType(assetType),
			type: type as TransactionType,
			date: new Date(date),
			quantity,
			price,
			commission,
		});

		return res.status(201).json(transaction);
	} catch (error) {
		if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
			return res.status(409).json({ message: "Ya existe una transaccion con ese id" });
		}

		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(400).json({ message });
	}
});

app.post("/api/alerts", async (req: Request, res: Response) => {
	try {
		const {
			userId,
			assetId,
			targetPrice,
			condition,
		} = req.body;

		if (!userId || !assetId || targetPrice === undefined || !condition) {
			return res.status(400).json({ message: "userId, assetId, targetPrice y condition son requeridos" });
		}

		if (typeof targetPrice !== "number" || targetPrice <= 0) {
			return res.status(400).json({ message: "targetPrice debe ser un número positivo" });
		}

		if (condition !== "GREATER_THAN" && condition !== "LESS_THAN") {
			return res.status(400).json({ message: "condition debe ser 'GREATER_THAN' o 'LESS_THAN'" });
		}

		// Validar que el ticker existe
		const isValidTicker = await tickerValidationService.validateTicker(assetId);
		if (!isValidTicker) {
			return res.status(400).json({
				message: `El ticker \"${assetId}\" no es válido o no existe en Yahoo Finance.`,
			});
		}

		const alert = new PriceAlert(
			randomUUID(),
			userId,
			assetId.toUpperCase(),
			targetPrice,
			condition,
			true,
		);

		await priceAlertRepository.save(alert);

		return res.status(201).json({
			id: alert.id,
			userId: alert.userId,
			assetId: alert.assetId,
			targetPrice: alert.targetPrice,
			condition: alert.condition,
			isActive: alert.isActive,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(400).json({ message });
	}
});

app.get("/api/alerts/:userId", async (req: Request, res: Response) => {
	try {
		const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

		const alerts = await priceAlertRepository.findByUserId(userId);

		return res.json(alerts.map((alert) => ({
			id: alert.id,
			userId: alert.userId,
			assetId: alert.assetId,
			targetPrice: alert.targetPrice,
			condition: alert.condition,
			isActive: alert.isActive,
		})));
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(400).json({ message });
	}
});

app.delete("/api/alerts/:id", async (req: Request, res: Response) => {
	try {
		const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

		const deleted = await priceAlertRepository.deleteById(id);

		if (!deleted) {
			return res.status(404).json({ message: "Alerta no encontrada" });
		}

		return res.status(204).send();
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(400).json({ message });
	}
});

process.on("SIGINT", async () => {
	await prisma.$disconnect();
	process.exit(0);
});

// Export app and database for testing
export { prisma as database };
export default app;

// Start server only when not running tests
if (process.env.NODE_ENV !== 'test') {
	httpServer.listen(port, () => {
		console.log(`Backend API listening on http://localhost:${port}`);
	});
}
