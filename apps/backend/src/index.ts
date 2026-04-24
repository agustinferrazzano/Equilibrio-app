import cors from "cors";
import express, { Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { AddTransactionUseCase, TransactionType } from "@equilibrio/core";
import { SqliteTransactionRepository } from "./repositories/SqliteTransactionRepository";

const app = express();
const port = 3001;
const dataDirectory = path.resolve(__dirname, "../data");
const databasePath = path.join(dataDirectory, "equilibrio.db");

fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(databasePath);
const transactionRepository = new SqliteTransactionRepository(database);
const addTransactionUseCase = new AddTransactionUseCase(transactionRepository);

app.use(cors());
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
	return res.json({
		message: "Bienvenido a la API de Equilibrio",
		status: "ok",
		docs: "/api/transactions",
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

		if (userId && assetId) {
			const transactions = await transactionRepository.findByUserIdAndAssetId(userId, assetId);
			return res.json(transactions);
		}

		if (userId) {
			const transactions = await transactionRepository.findByUserId(userId);
			return res.json(transactions);
		}

		const transactions = await transactionRepository.findAll();
		return res.json(transactions);
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
