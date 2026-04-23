"use client";

import { useState } from "react";
import { Transaction } from "@equilibrio/core";
import TransactionForm from "./components/TransactionForm";
import TransactionList from "./components/TransactionList";

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const handleTransactionAdded = (transaction: Transaction) => {
    setTransactions([...transactions, transaction]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">Equilibrio</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <TransactionForm onTransactionAdded={handleTransactionAdded} />
          </div>

          <div className="lg:col-span-2">
            <TransactionList transactions={transactions} />
          </div>
        </div>
      </div>
    </div>
  );
}

