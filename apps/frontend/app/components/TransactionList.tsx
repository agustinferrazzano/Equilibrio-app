"use client";

import { TransactionRecord } from "../types";

interface TransactionListProps {
  transactions: TransactionRecord[];
  onEdit: (transaction: TransactionRecord) => void;
  onRequestDelete: (id: string) => void;
  deletingId: string | null;
}

export default function TransactionList({
  transactions,
  onEdit,
  onRequestDelete,
  deletingId,
}: TransactionListProps) {
  return (
    <div className="surface-card rounded-xl p-4 md:p-6">
      <h2 className="display-font mb-4 text-3xl text-slate-100">Transacciones</h2>

      {transactions.length === 0 ? (
        <p className="text-slate-400">No hay transacciones aun.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm text-slate-200">
            <thead className="bg-slate-900/70">
              <tr>
                <th className="w-[8%] px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">ID</th>
                <th className="w-[9%] px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Activo</th>
                <th className="w-[10%] px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Tipo accion</th>
                <th className="w-[8%] px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Operacion</th>
                <th className="w-[8%] px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Cantidad</th>
                <th className="w-[8%] px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Precio</th>
                <th className="w-[8%] px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Comision</th>
                <th className="w-[10%] px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Total</th>
                <th className="w-[9%] px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Ganancia</th>
                <th className="w-[8%] px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Fecha</th>
                <th className="w-[14%] px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-t border-slate-700/60 hover:bg-slate-800/35">
                  <td className="truncate px-3 py-2 text-slate-100" title={transaction.id}>{transaction.id}</td>
                  <td className="truncate px-3 py-2 text-slate-100" title={transaction.assetId}>{transaction.assetId}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        transaction.assetType === "CEDEAR"
                          ? "bg-sky-500/20 text-sky-300"
                          : "bg-slate-500/25 text-slate-200"
                      }`}
                    >
                      {transaction.assetType === "CEDEAR" ? "CEDEAR" : "ACCION LOCAL"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        transaction.type === "BUY"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-200">{transaction.quantity}</td>
                  <td className="px-3 py-2 text-slate-200">${transaction.price.toFixed(2)}</td>
                  <td className="px-3 py-2 text-slate-200">${transaction.commission.toFixed(2)}</td>
                  <td className="px-3 py-2 font-semibold text-amber-200">
                    ${(transaction.quantity * transaction.price + transaction.commission).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-slate-200 font-medium">
                    {transaction.type === "SELL" ? (
                      <span className="text-slate-400">${transaction.price.toFixed(2)}</span>
                    ) : transaction.currentMarketPrice != null ? (
                      (() => {
                        const currentPrice = transaction.currentMarketPrice;
                        const buyPrice = transaction.price;
                        const quantity = transaction.quantity;
                        const diff = (currentPrice - buyPrice) * quantity;
                        const isPositive = diff >= 0;
                        const sign = isPositive ? "+" : "-";
                        return (
                          <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                            {sign}${Math.abs(diff).toFixed(2)}
                          </span>
                        );
                      })()
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(transaction)}
                        className="rounded-md bg-amber-500/20 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/30"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestDelete(transaction.id)}
                        disabled={deletingId === transaction.id}
                        className="rounded-md bg-rose-500/20 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-500/30 disabled:opacity-50"
                      >
                        {deletingId === transaction.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
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
