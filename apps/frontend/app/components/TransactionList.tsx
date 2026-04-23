"use client";

import { Transaction } from "@equilibrio/core";

interface TransactionListProps {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: TransactionListProps) {
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Transacciones</h2>

      {transactions.length === 0 ? (
        <p className="text-gray-500">No hay transacciones aún.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">ID</th>
                <th className="px-4 py-2 text-left font-semibold">Usuario</th>
                <th className="px-4 py-2 text-left font-semibold">Activo</th>
                <th className="px-4 py-2 text-left font-semibold">Tipo</th>
                <th className="px-4 py-2 text-left font-semibold">Cantidad</th>
                <th className="px-4 py-2 text-left font-semibold">Precio</th>
                <th className="px-4 py-2 text-left font-semibold">Comisión</th>
                <th className="px-4 py-2 text-left font-semibold">Total</th>
                <th className="px-4 py-2 text-left font-semibold">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">{transaction.id}</td>
                  <td className="px-4 py-2 text-gray-900">{transaction.userId}</td>
                  <td className="px-4 py-2 text-gray-900">{transaction.assetId}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        transaction.type === "BUY"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-900">{transaction.quantity}</td>
                  <td className="px-4 py-2 text-gray-900">${transaction.price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-gray-900">${transaction.commission.toFixed(2)}</td>
                  <td className="px-4 py-2 font-semibold text-gray-900">
                    ${(transaction.quantity * transaction.price + transaction.commission).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-gray-900">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
