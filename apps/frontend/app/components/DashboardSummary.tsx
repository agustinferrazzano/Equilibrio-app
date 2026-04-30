"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { TransactionRecord } from "../types";
import { generatePortfolioPDF } from "../utils/generatePdfReport";

type AssetType = "CEDEAR" | "ACCION_LOCAL";

interface AssetSummary {
  assetId: string;
  assetType: AssetType;
  totalQuantity: number;
  averagePrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  yieldPercentage: number;
}

interface DashboardSummaryResponse {
  assets: AssetSummary[];
  totalPortfolioValueARS: number;
  totalPortfolioValueUSD: number | null;
  exchangeRateUsed: number | null;
}

interface DashboardSummaryProps {
  refreshToken: number;
  filterUserId: string;
  filterAssetId: string;
}

const CHART_COLORS = [
  "#38bdf8",
  "#34d399",
  "#a78bfa",
  "#f59e0b",
  "#f87171",
  "#22d3ee",
  "#4ade80",
  "#f472b6",
];

const formatCurrency = (value: unknown): string => {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return "$0.00";
  }

  return `$${numericValue.toFixed(2)}`;
};

const normalizeFilter = (value: string): string | undefined => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const buildSummary = (
  transactions: TransactionRecord[],
  exchangeRateUsed: number | null,
): DashboardSummaryResponse => {
  type Accumulator = {
    assetType: AssetType;
    totalQuantity: number;
    totalCost: number;
  };

  const byAsset = new Map<string, Accumulator>();

  const sortedTransactions = [...transactions].sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
  );

  for (const transaction of sortedTransactions) {
    const current = byAsset.get(transaction.assetId) ?? {
      assetType: transaction.assetType,
      totalQuantity: 0,
      totalCost: 0,
    };

    current.assetType = transaction.assetType;

    if (transaction.type === "BUY") {
      current.totalQuantity += transaction.quantity;
      current.totalCost += transaction.quantity * transaction.price + transaction.commission;
    } else {
      if (current.totalQuantity <= 0) {
        continue;
      }

      const quantityToSell = Math.min(transaction.quantity, current.totalQuantity);
      const averagePrice = current.totalCost / current.totalQuantity;

      current.totalQuantity -= quantityToSell;
      current.totalCost -= averagePrice * quantityToSell;
    }

    if (current.totalQuantity <= 0) {
      byAsset.delete(transaction.assetId);
      continue;
    }

    byAsset.set(transaction.assetId, current);
  }

  const assets = Array.from(byAsset.entries()).map(([assetId, totals]) => {
    const averagePrice = totals.totalCost / totals.totalQuantity;
    const currentValue = totals.totalCost;

    return {
      assetId,
      assetType: totals.assetType,
      totalQuantity: Number(totals.totalQuantity.toFixed(6)),
      averagePrice: Number(averagePrice.toFixed(6)),
      totalInvested: Number(totals.totalCost.toFixed(6)),
      currentPrice: Number(averagePrice.toFixed(6)),
      currentValue: Number(currentValue.toFixed(6)),
      yieldPercentage: 0,
    };
  });

  const totalPortfolioValueARS = Number(
    assets.reduce((sum, asset) => sum + asset.currentValue, 0).toFixed(2),
  );
  const totalPortfolioValueUSD =
    exchangeRateUsed && exchangeRateUsed > 0
      ? Number((totalPortfolioValueARS / exchangeRateUsed).toFixed(2))
      : null;

  return {
    assets,
    totalPortfolioValueARS,
    totalPortfolioValueUSD,
    exchangeRateUsed,
  };
};

export default function DashboardSummary({
  refreshToken,
  filterUserId,
  filterAssetId,
}: DashboardSummaryProps) {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizedUserId = useMemo(() => normalizeFilter(filterUserId), [filterUserId]);
  const normalizedAssetId = useMemo(() => normalizeFilter(filterAssetId), [filterAssetId]);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "1000",
          sortBy: "date",
          sortOrder: "desc",
        });

        if (normalizedUserId) {
          params.set("userId", normalizedUserId);
        }

        if (normalizedAssetId) {
          params.set("assetId", normalizedAssetId);
        }

        const [transactionsResponse, exchangeRateResponse] = await Promise.all([
          fetch(`http://localhost:3001/api/transactions?${params.toString()}`, {
            cache: "no-store",
          }),
          fetch("http://localhost:3001/api/exchange-rate", { cache: "no-store" }),
        ]);

        if (!transactionsResponse.ok) {
          throw new Error("No se pudo cargar el resumen del portfolio");
        }

        const transactionPayload = (await transactionsResponse.json()) as {
          data: TransactionRecord[];
        };

        let exchangeRateUsed: number | null = null;
        if (exchangeRateResponse.ok) {
          const exchangeRatePayload = (await exchangeRateResponse.json()) as {
            exchangeRateUsed: number | null;
          };
          exchangeRateUsed = exchangeRatePayload.exchangeRateUsed;
        }

        setSummary(buildSummary(transactionPayload.data, exchangeRateUsed));
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "Error desconocido";
        setError(message);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [refreshToken, normalizedUserId, normalizedAssetId]);

  const items = summary?.assets ?? [];
  const totalInvested = items.reduce((acc, item) => acc + item.totalInvested, 0) || 0;
  const scopeLabel = [normalizedUserId ? `user=${normalizedUserId}` : null, normalizedAssetId ? `asset=${normalizedAssetId}` : null]
    .filter(Boolean)
    .join(" · ") || "all transactions";

  return (
    <section className="surface-card mb-4 rounded-xl p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
          Dashboard Summary
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-slate-400">Scope: {scopeLabel}</p>
          {!loading && !error && summary && items.length > 0 && (
            <button
              onClick={() => generatePortfolioPDF(summary)}
              className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-700"
            >
              ↓ Descargar PDF
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-slate-400">Cargando resumen...</p>}

      {error && (
        <div className="rounded-md border border-rose-300/25 bg-rose-700/20 p-3">
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-slate-400">No hay posiciones activas para mostrar.</p>
      )}

      {!loading && !error && summary && items.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="surface-panel rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total en ARS</p>
              <p className="mt-2 text-3xl font-bold text-cyan-200">
                {formatCurrency(summary.totalPortfolioValueARS)}
              </p>
            </div>
            <div className="surface-panel rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total en USD</p>
              <p className="mt-2 text-3xl font-bold text-emerald-300">
                {summary.totalPortfolioValueUSD !== null
                  ? formatCurrency(summary.totalPortfolioValueUSD)
                  : "N/A"}
              </p>
              {summary.exchangeRateUsed && (
                <p className="mt-2 text-xs text-slate-400">
                  MEP: {formatCurrency(summary.exchangeRateUsed)}
                </p>
              )}
            </div>
            <div className="surface-panel rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total Invertido</p>
              <p className="mt-2 text-3xl font-bold text-cyan-200">
                {formatCurrency(totalInvested)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="surface-panel rounded-xl p-4 lg:col-span-2">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={items}
                      dataKey="currentValue"
                      nameKey="assetId"
                      innerRadius={60}
                      outerRadius={105}
                      paddingAngle={3}
                    >
                      {items.map((item, index) => (
                        <Cell
                          key={item.assetId}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "#0f1522",
                        border: "1px solid #34435d",
                        color: "#eaf0f8",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="surface-panel rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Posiciones</p>
              <div className="mt-4 space-y-2">
                {items.map((item) => (
                  <div key={item.assetId} className="rounded-md border border-slate-700/60 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-200">{item.assetId}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          item.assetType === "CEDEAR"
                            ? "bg-sky-500/20 text-sky-300"
                            : "bg-slate-500/20 text-slate-300"
                        }`}
                      >
                        {item.assetType === "CEDEAR" ? "CEDEAR" : "Local"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Qty: {item.totalQuantity.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">Avg: {formatCurrency(item.averagePrice)}</p>
                    <p className="text-xs text-slate-400">Current: {formatCurrency(item.currentPrice)}</p>
                    <p className="text-xs text-slate-400">Value: {formatCurrency(item.currentValue)}</p>
                    <p
                      className={`text-xs font-semibold ${
                        item.yieldPercentage >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      Yield: {item.yieldPercentage.toFixed(2)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
