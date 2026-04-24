import cors from "cors";
import express, { Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { AddTransactionUseCase, Transaction, TransactionType } from "@equilibrio/core";
import { runMigrations } from "./database/migrations";
import { SqliteTransactionRepository } from "./repositories/SqliteTransactionRepository";

const app = express();
const port = 3001;
const dataDirectory = path.resolve(__dirname, "../data");
const databasePath = path.join(dataDirectory, "equilibrio.db");

fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(databasePath);
runMigrations(database);
const transactionRepository = new SqliteTransactionRepository(database);
const addTransactionUseCase = new AddTransactionUseCase(transactionRepository);

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

app.post("/api/transactions", async (req: Request, res: Response) => {
	try {
		const {
			id,
			userId,
			assetId,
			type,
			date,
			quantity,
			price,
			commission,
		} = req.body;

		const transaction = await addTransactionUseCase.execute({
			id,
			userId,
			assetId,
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

process.on("SIGINT", () => {
	database.close();
	process.exit(0);
});

app.listen(port, () => {
	console.log(`Backend API listening on http://localhost:${port}`);
});
