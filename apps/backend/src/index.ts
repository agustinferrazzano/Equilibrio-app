import cors from "cors";
import express, { Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import {
	AddTransactionUseCase,
	GetPortfolioSummaryUseCase,
	GetPortfolioEvolutionUseCase,
	CheckPriceAlertsUseCase,
	Transaction,
	TransactionType,
	PriceAlert,
} from "@equilibrio/core";
import { runMigrations } from "./database/migrations";
import { SqliteTransactionRepository } from "./repositories/SqliteTransactionRepository";
import { SqlitePriceAlertRepository } from "./repositories/SqlitePriceAlertRepository";
import { YahooFinanceService } from "./services/YahooFinanceService";
import { DolarApiService } from "./services/DolarApiService";
import { tickerValidationService } from "./services/TickerValidationService";
import { startPriceAlertsCronJob } from "./jobs/priceAlertsJob";

const app = express();
const port = 3001;
const dataDirectory = path.resolve(__dirname, "../data");
const databasePath = path.join(dataDirectory, "equilibrio.db");

fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(databasePath);
runMigrations(database);
const transactionRepository = new SqliteTransactionRepository(database);
const priceAlertRepository = new SqlitePriceAlertRepository(database);
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
	startPriceAlertsCronJob(checkPriceAlertsUseCase);
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

		return res.json(result);
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

process.on("SIGINT", () => {
	database.close();
	process.exit(0);
});

// Export app for testing
export default app;

// Start server only when not running tests
if (process.env.NODE_ENV !== 'test') {
	app.listen(port, () => {
		console.log(`Backend API listening on http://localhost:${port}`);
	});
}
