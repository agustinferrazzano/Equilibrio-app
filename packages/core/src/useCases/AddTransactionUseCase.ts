import { randomUUID } from "crypto";
import { Transaction, TransactionType } from "../models/Transaction";
import { ITransactionRepository } from "../repositories/ITransactionRepository";

export interface AddTransactionInput {
  userId: string;
  assetId: string;
  type: TransactionType;
  quantity: number;
  price: number;
  commission: number;
}

export class AddTransactionUseCase {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  async execute(input: AddTransactionInput): Promise<Transaction> {
    if (input.quantity <= 0) {
      throw new Error("La cantidad debe ser mayor a cero.");
    }

    const transaction = new Transaction(
      randomUUID(),
      input.userId,
      input.assetId,
      input.type,
      input.quantity,
      input.price,
      input.commission,
    );

    await this.transactionRepository.save(transaction);

    return transaction;
  }
}