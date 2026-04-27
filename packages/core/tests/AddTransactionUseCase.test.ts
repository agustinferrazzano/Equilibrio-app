import { AddTransactionUseCase } from "../src/useCases/AddTransactionUseCase";
import { MockTransactionRepository } from "../src/repositories/mocks/MockTransactionRepository";

describe("AddTransactionUseCase", () => {
  it("should save a BUY transaction and calculate the total value", async () => {
    const transactionRepository = new MockTransactionRepository();
    const addTransactionUseCase = new AddTransactionUseCase(transactionRepository);

    const transaction = await addTransactionUseCase.execute({
      id: "transaction-1",
      userId: "user-1",
      assetId: "asset-1",
      assetType: "CEDEAR",
      type: "BUY",
      date: new Date("2026-04-22T00:00:00.000Z"),
      quantity: 2,
      price: 100,
      commission: 5,
    });

    const savedTransactions = await transactionRepository.findByUserIdAndAssetId(
      "user-1",
      "asset-1",
    );

    expect(savedTransactions).toHaveLength(1);
    expect(savedTransactions[0]).toEqual(transaction);
    expect(transaction.getTotalValue()).toBe(205);
  });

  it("should reject when the quantity is zero or less", async () => {
    const transactionRepository = new MockTransactionRepository();
    const addTransactionUseCase = new AddTransactionUseCase(transactionRepository);

    await expect(
      addTransactionUseCase.execute({
        id: "transaction-1",
        userId: "user-1",
        assetId: "asset-1",
        assetType: "ACCION_LOCAL",
        type: "BUY",
        date: new Date("2026-04-22T00:00:00.000Z"),
        quantity: 0,
        price: 100,
        commission: 5,
      }),
    ).rejects.toThrow("La cantidad debe ser mayor a cero.");
  });
});