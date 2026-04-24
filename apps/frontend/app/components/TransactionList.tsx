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
    <div className="surface-card rounded-xl p-5 md:p-6">
      <h2 className="display-font mb-4 text-3xl text-slate-100">Transacciones</h2>

      {transactions.length === 0 ? (
        <p className="text-slate-400">No hay transacciones aun.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm text-slate-200">
            <thead className="bg-slate-900/70">
              <tr>
                <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">ID</th>
                <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Usuario</th>
                <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Activo</th>
                <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Tipo</th>
                <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Cantidad</th>
                <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Precio</th>
                <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Comision</th>
                <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Total</th>
                <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Fecha</th>
                <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-t border-slate-700/60 hover:bg-slate-800/35">
                  <td className="px-4 py-2 text-slate-100">{transaction.id}</td>
                  <td className="px-4 py-2 text-slate-100">{transaction.userId}</td>
                  <td className="px-4 py-2 text-slate-100">{transaction.assetId}</td>
                  <td className="px-4 py-2">
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
                  <td className="px-4 py-2 text-slate-200">{transaction.quantity}</td>
                  <td className="px-4 py-2 text-slate-200">${transaction.price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-slate-200">${transaction.commission.toFixed(2)}</td>
                  <td className="px-4 py-2 font-semibold text-amber-200">
                    ${(transaction.quantity * transaction.price + transaction.commission).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-slate-300">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(transaction)}
                        className="rounded-md bg-amber-500/20 px-3 py-1 text-amber-200 hover:bg-amber-500/30"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestDelete(transaction.id)}
                        disabled={deletingId === transaction.id}
                        className="rounded-md bg-rose-500/20 px-3 py-1 text-rose-200 hover:bg-rose-500/30 disabled:opacity-50"
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
