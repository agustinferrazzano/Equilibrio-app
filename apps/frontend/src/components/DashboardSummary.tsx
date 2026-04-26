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

interface PortfolioSummaryItem {
  assetId: string;
  totalQuantity: number;
  averagePrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  yieldPercentage: number;
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
  const [items, setItems] = useState<PortfolioSummaryItem[]>([]);
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

        const data = (await response.json()) as PortfolioSummaryItem[];
        setItems(data);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "Error desconocido";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const totalInvested = useMemo(
    () => items.reduce((accumulator, item) => accumulator + item.totalInvested, 0),
    [items],
  );

  const totalPortfolioValue = useMemo(
    () => items.reduce((accumulator, item) => accumulator + item.currentValue, 0),
    [items],
  );

  const totalYieldPercentage = useMemo(() => {
    if (totalInvested <= 0) {
      return 0;
    }

    return ((totalPortfolioValue - totalInvested) / totalInvested) * 100;
  }, [totalInvested, totalPortfolioValue]);

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

      {!loading && !error && items.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="surface-panel rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total Portfolio Value</p>
              <p className="mt-2 text-3xl font-bold text-cyan-200">{formatCurrency(totalPortfolioValue)}</p>
            </div>
            <div className="surface-panel rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total Yield %</p>
              <p
                className={`mt-2 text-3xl font-bold ${
                  totalYieldPercentage >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {totalYieldPercentage.toFixed(2)}%
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
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total Invested</p>
            <p className="mt-2 text-3xl font-bold text-cyan-200">{formatCurrency(totalInvested)}</p>
            <div className="mt-4 space-y-2">
              {items.map((item) => (
                <div key={item.assetId} className="rounded-md border border-slate-700/60 p-2">
                  <p className="text-sm font-semibold text-slate-200">{item.assetId}</p>
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
