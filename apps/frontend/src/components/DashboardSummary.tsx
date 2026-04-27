"use client";

import { useEffect, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface PortfolioAssetSummary {
  assetId: string;
  type: "CEDEAR" | "ACCION_LOCAL";
  totalQuantity: number;
  averagePrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  yieldPercentage: number;
  theoreticalPriceARS?: number;
  spreadPercentage?: number;
}

interface PortfolioSummaryResponse {
  assets: PortfolioAssetSummary[];
  totalPortfolioValueARS: number;
  totalPortfolioValueUSD: number | null;
  exchangeRateUsed: number | null;
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

const DEMO_USER_ID = "user-page";

const formatCurrency = (value: unknown): string => {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return "$0.00";
  }

  return `$${numericValue.toFixed(2)}`;
};

export default function DashboardSummary() {
  const [summary, setSummary] = useState<PortfolioSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`http://localhost:3001/api/portfolio/${DEMO_USER_ID}`);

        if (!response.ok) {
          throw new Error("No se pudo cargar el resumen del portfolio");
        }

        const data = (await response.json()) as PortfolioSummaryResponse;
        setSummary(data);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "Error desconocido";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const items = summary?.assets ?? [];
  const totalInvested =
    items.reduce((acc, item) => acc + item.totalInvested, 0) || 0;

  return (
    <section className="surface-card mb-4 rounded-xl p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
          Dashboard Summary
        </h3>
        <p className="text-xs text-slate-400">User: {DEMO_USER_ID}</p>
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
                ${summary.totalPortfolioValueARS.toFixed(2)}
              </p>
            </div>
            <div className="surface-panel rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total en USD</p>
              <p className="mt-2 text-3xl font-bold text-emerald-300">
                {summary.totalPortfolioValueUSD ? `$${summary.totalPortfolioValueUSD.toFixed(2)}` : "N/A"}
              </p>
              {summary.exchangeRateUsed && (
                <p className="mt-2 text-xs text-slate-400">
                  MEP: ${summary.exchangeRateUsed.toFixed(2)}
                </p>
              )}
            </div>
            <div className="surface-panel rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total Invertido</p>
              <p className="mt-2 text-3xl font-bold text-cyan-200">
                ${totalInvested.toFixed(2)}
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
                          item.type === "CEDEAR"
                            ? "bg-sky-500/20 text-sky-300"
                            : "bg-slate-500/20 text-slate-300"
                        }`}
                      >
                        {item.type === "CEDEAR" || item.theoreticalPriceARS !== undefined
                          ? "CEDEAR"
                          : "Local"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Qty: {item.totalQuantity.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">Avg: ${item.averagePrice.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">Current: {formatCurrency(item.currentPrice)}</p>
                    <p className="text-xs text-slate-400">Value: {formatCurrency(item.currentValue)}</p>
                    <p
                      className={`text-xs font-semibold ${
                        item.yieldPercentage >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      Yield: {item.yieldPercentage.toFixed(2)}%
                    </p>
                    {(item.type === "CEDEAR" || item.theoreticalPriceARS !== undefined) && (
                      <>
                        <p className="text-xs text-slate-400">
                          Theoretical Price: {formatCurrency(item.theoreticalPriceARS)}
                        </p>
                        {item.spreadPercentage !== undefined && (
                          <p
                            className={`text-xs font-semibold ${
                              item.spreadPercentage > 2
                                ? "text-red-500"
                                : item.spreadPercentage < -2
                                  ? "text-green-500"
                                  : "text-slate-300"
                            }`}
                          >
                            Spread: {item.spreadPercentage.toFixed(2)}%
                          </p>
                        )}
                      </>
                    )}
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
