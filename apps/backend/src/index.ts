import cors from "cors";
import express, { Request, Response } from "express";
import {
	AddTransactionUseCase,
	MockTransactionRepository,
	TransactionType,
} from "@equilibrio/core";

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

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

		const transactionRepository = new MockTransactionRepository();
		const addTransactionUseCase = new AddTransactionUseCase(transactionRepository);

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
		const message = error instanceof Error ? error.message : "Error inesperado";
		return res.status(400).json({ message });
	}
});

app.listen(port, () => {
	console.log(`Backend API listening on http://localhost:${port}`);
});
