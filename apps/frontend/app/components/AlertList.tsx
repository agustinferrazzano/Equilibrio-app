"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../utils/api";

interface PriceAlert {
  id: string;
  userId: string;
  assetId: string;
  targetPrice: number;
  condition: "GREATER_THAN" | "LESS_THAN";
  isActive: boolean;
}

interface AlertListProps {
  userId: string;
  refreshToken?: number;
}

const formatCurrency = (value: number): string => `$${value.toFixed(2)}`;

const conditionLabel = (condition: "GREATER_THAN" | "LESS_THAN"): string =>
  condition === "GREATER_THAN" ? "Mayor que (>)" : "Menor que (<)";

export default function AlertList({ userId, refreshToken }: AlertListProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!userId.trim()) {
      setAlerts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/api/alerts/${userId.trim()}`), {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("No se pudieron cargar las alertas");
      }

      const data = (await response.json()) as PriceAlert[];
      setAlerts(data);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Error desconocido";
      setError(message);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts, refreshToken]);

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;

    setDeletingId(pendingDeleteId);
    setPendingDeleteId(null);

    try {
      const response = await fetch(apiUrl(`/api/alerts/${pendingDeleteId}`), {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        throw new Error(errorData.message || "No se pudo eliminar la alerta");
      }

      setAlerts((previous) =>
        previous.filter((alert) => alert.id !== pendingDeleteId),
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Error al eliminar",
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (!userId.trim()) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-6">
        <span className="text-2xl">🔔</span>
        <p className="text-sm text-slate-400">
          Ingresá un User ID para ver las alertas activas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
          Alertas activas
          {!loading && alerts.length > 0 && (
            <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              {alerts.length}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={fetchAlerts}
          disabled={loading}
          className="btn-muted rounded-md px-3 py-1 text-xs disabled:opacity-50"
        >
          {loading ? "Cargando..." : "↻ Actualizar"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-rose-300/25 bg-rose-700/20 px-4 py-3">
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-6">
          <span className="text-2xl">✅</span>
          <p className="text-sm text-slate-400">
            No hay alertas configuradas para{" "}
            <span className="font-semibold text-slate-200">{userId}</span>.
          </p>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="w-full table-fixed text-sm text-slate-200">
            <thead className="bg-slate-900/70">
              <tr>
                <th className="w-[20%] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Ticker
                </th>
                <th className="w-[30%] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Condición
                </th>
                <th className="w-[20%] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Precio objetivo
                </th>
                <th className="w-[15%] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Estado
                </th>
                <th className="w-[15%] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr
                  key={alert.id}
                  className="border-t border-slate-700/50 transition-colors hover:bg-slate-800/30"
                >
                  <td className="px-4 py-3">
                    <span className="font-semibold text-cyan-300">
                      {alert.assetId}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        alert.condition === "GREATER_THAN"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-rose-500/15 text-rose-300"
                      }`}
                    >
                      <span>
                        {alert.condition === "GREATER_THAN" ? "▲" : "▼"}
                      </span>
                      {conditionLabel(alert.condition)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-amber-200">
                    {formatCurrency(alert.targetPrice)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        alert.isActive
                          ? "bg-cyan-500/15 text-cyan-300"
                          : "bg-slate-600/30 text-slate-400"
                      }`}
                    >
                      {alert.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(alert.id)}
                      disabled={deletingId === alert.id}
                      className="rounded-md bg-rose-500/20 px-2.5 py-1 text-xs text-rose-200 transition hover:bg-rose-500/35 disabled:opacity-50"
                    >
                      {deletingId === alert.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm delete modal */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-sm space-y-4 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/20 text-xl">
                🗑️
              </span>
              <div>
                <h4 className="font-semibold text-slate-100">
                  Eliminar alerta
                </h4>
                <p className="text-xs text-slate-400">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              ¿Confirmás la eliminación de la alerta{" "}
              <span className="font-mono text-amber-300">
                {pendingDeleteId.slice(0, 8)}…
              </span>
              ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="btn-muted rounded-md px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
