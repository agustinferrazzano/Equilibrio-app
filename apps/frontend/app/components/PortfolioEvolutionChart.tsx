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

const DEMO_USER_ID = "user-page";

const formatCurrency = (value: unknown): string => {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return "$0.00";
  }

  return `$${numericValue.toFixed(2)}`;
};

export default function PortfolioEvolutionChart() {
  const [data, setData] = useState<PortfolioEvolutionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvolution = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          apiUrl(`/api/portfolio/${DEMO_USER_ID}/evolution`),
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("No se pudo cargar la evolucion historica");
        }

        const payload = (await response.json()) as PortfolioEvolutionPoint[];
        setData(payload);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "Error desconocido";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvolution();
  }, []);

  return (
    <section className="surface-card rounded-xl p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
            Evolucion historica
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Valor del portfolio en ARS durante los ultimos 30 dias.
          </p>
        </div>
      </div>

      {loading && <p className="text-slate-400">Cargando evolucion...</p>}

      {error && (
        <div className="rounded-md border border-rose-300/25 bg-rose-700/20 p-3">
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <p className="text-slate-400">No hay datos historicos para mostrar.</p>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="portfolioEvolutionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.42} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.45} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "#475569" }}
                tickLine={{ stroke: "#475569" }}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "#475569" }}
                tickLine={{ stroke: "#475569" }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => `Fecha: ${label}`}
                contentStyle={{
                  backgroundColor: "#0f1522",
                  border: "1px solid #34435d",
                  color: "#eaf0f8",
                }}
              />
              <Area
                type="monotone"
                dataKey="totalValueARS"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#portfolioEvolutionFill)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
