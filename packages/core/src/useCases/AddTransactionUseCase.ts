import { Transaction, TransactionType } from "../models/Transaction";
import { ITransactionRepository } from "../repositories/ITransactionRepository";

export interface AddTransactionInput {
  id: string;
  userId: string;
  assetId: string;
  type: TransactionType;
  date: Date;
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
      input.id,
      input.userId,
      input.assetId,
      input.type,
      input.date,
      input.quantity,
      input.price,
      input.commission,
    );

    await this.transactionRepository.save(transaction);

    return transaction;
  }
}