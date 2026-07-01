"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiUrl } from "../utils/api";

interface PortfolioEvolutionPoint {
  date: string;
  totalValueARS: number;
}

interface PortfolioEvolutionChartProps {
  userId: string;
}

const formatCurrency = (value: unknown): string => {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return "$0.00";
  return `$${numericValue.toFixed(2)}`;
};

export default function PortfolioEvolutionChart({ userId }: PortfolioEvolutionChartProps) {
  const [data, setData] = useState<PortfolioEvolutionPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId.trim()) {
      setData([]);
      setLoading(false);
      return;
    }

    const fetchEvolution = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          apiUrl(`/api/portfolio/${userId.trim()}/evolution`),
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("No se pudo cargar la evolución histórica");
        }

        const payload = (await response.json()) as PortfolioEvolutionPoint[];
        setData(payload);
      } catch (fetchError) {
        const message =
          fetchError instanceof Error ? fetchError.message : "Error desconocido";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvolution();
  }, [userId]);

  return (
    <section className="surface-card rounded-xl p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
            Evolución histórica
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {userId.trim()
              ? `Valor del portfolio de "${userId}" en ARS — últimos 30 días.`
              : "Ingresá un usuario activo para ver la evolución."}
          </p>
        </div>
        {userId.trim() && (
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-300">
            {userId}
          </span>
        )}
      </div>

      {/* No user selected */}
      {!userId.trim() && (
        <div className="flex items-center gap-4 rounded-xl border border-slate-700/40 bg-slate-800/30 px-5 py-8">
          <span className="text-3xl">📈</span>
          <div>
            <p className="font-semibold text-slate-300">Sin usuario activo</p>
            <p className="mt-0.5 text-sm text-slate-500">
              Ingresá un User ID en el campo "Usuario activo" para ver la evolución real del portfolio.
            </p>
          </div>
        </div>
      )}

      {userId.trim() && loading && (
        <div className="flex items-center gap-3 py-8">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="text-sm text-slate-400">Cargando evolución histórica...</p>
        </div>
      )}

      {userId.trim() && error && (
        <div className="rounded-md border border-rose-300/25 bg-rose-700/20 p-3">
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      )}

      {userId.trim() && !loading && !error && data.length === 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-slate-700/40 bg-slate-800/30 px-5 py-8">
          <span className="text-3xl">🕐</span>
          <div>
            <p className="font-semibold text-slate-300">Sin datos históricos</p>
            <p className="mt-0.5 text-sm text-slate-500">
              No hay transacciones registradas para <span className="text-slate-300">"{userId}"</span>.
            </p>
          </div>
        </div>
      )}

      {userId.trim() && !loading && !error && data.length > 0 && (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="portfolioEvolutionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.45} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={{ stroke: "#475569" }}
                tickLine={{ stroke: "#475569" }}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={{ stroke: "#475569" }}
                tickLine={{ stroke: "#475569" }}
                tickFormatter={(value) => formatCurrency(value)}
                width={90}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value), "Valor ARS"]}
                labelFormatter={(label) => `📅 ${label}`}
                contentStyle={{
                  backgroundColor: "#0f1522",
                  border: "1px solid #34435d",
                  color: "#eaf0f8",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="totalValueARS"
                stroke="#38bdf8"
                strokeWidth={2.5}
                fill="url(#portfolioEvolutionFill)"
                dot={false}
                activeDot={{ r: 5, fill: "#38bdf8", stroke: "#0f1522", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

