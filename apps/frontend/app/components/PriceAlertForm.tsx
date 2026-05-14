"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiUrl } from "../utils/api";

interface PriceAlertFormProps {
  onAlertCreated: () => void;
}

type AlertCondition = "GREATER_THAN" | "LESS_THAN";

interface FormValues {
  userId: string;
  assetId: string;
  targetPrice: string;
  condition: AlertCondition | "";
}

const EMPTY_VALUES: FormValues = {
  userId: "",
  assetId: "",
  targetPrice: "",
  condition: "",
};

export default function PriceAlertForm({ onAlertCreated }: PriceAlertFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [availableTickers, setAvailableTickers] = useState<string[]>([]);
  const [tickerFilter, setTickerFilter] = useState("");
  const [loadingTickers, setLoadingTickers] = useState(true);
  const [showTickerDropdown, setShowTickerDropdown] = useState(false);

  // Cargar tickers disponibles
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const response = await fetch(apiUrl("/api/tickers/suggested"));
        if (response.ok) {
          const tickers = (await response.json()) as string[];
          setAvailableTickers(tickers);
        }
      } catch {
        console.error("Error loading tickers");
      } finally {
        setLoadingTickers(false);
      }
    };

    fetchTickers();
  }, []);

  const handleChange = (field: keyof FormValues, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  };

  const filteredTickers = availableTickers.filter((ticker) =>
    ticker.toUpperCase().includes(tickerFilter.toUpperCase()),
  );

  const handleSelectTicker = (ticker: string) => {
    handleChange("assetId", ticker);
    setTickerFilter(ticker);
    setShowTickerDropdown(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!values.userId.trim()) {
      setError("El User ID es requerido");
      setLoading(false);
      return;
    }

    if (!values.assetId.trim()) {
      setError("Debe seleccionar un ticker válido");
      setLoading(false);
      return;
    }

    if (!values.targetPrice.trim()) {
      setError("El precio objetivo es requerido");
      setLoading(false);
      return;
    }

    if (!values.condition) {
      setError("La condición es requerida");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/alerts"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: values.userId.trim(),
          assetId: values.assetId.toUpperCase(),
          targetPrice: Number.parseFloat(values.targetPrice),
          condition: values.condition,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "No se pudo crear la alerta");
      }

      setSuccessMessage("Alerta de precio creada exitosamente");
      setValues(EMPTY_VALUES);
      setTickerFilter("");
      onAlertCreated();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="surface-card space-y-4 rounded-xl p-5 md:p-6">
      <h2 className="display-font mb-1 text-3xl text-slate-100">Crear Alerta de Precio</h2>
      <p className="text-sm text-slate-400">
        Configura una alerta para que te notifique cuando un activo alcance un precio objetivo.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="ui-label block">User ID</label>
          <input
            type="text"
            name="userId"
            required
            value={values.userId}
            onChange={(e) => handleChange("userId", e.target.value)}
            className="ui-input mt-1"
            placeholder="user-1"
          />
        </div>

        <div className="md:col-span-2">
          <label className="ui-label block">Ticker (Acción o CEDEAR)</label>
          <div className="relative mt-1">
            <input
              type="text"
              name="tickerFilter"
              required
              value={tickerFilter}
              onChange={(e) => setTickerFilter(e.target.value)}
              onFocus={() => setShowTickerDropdown(true)}
              placeholder="Busca: MELI, AAPL, MSFT, SAP..."
              className="ui-input w-full"
              disabled={loadingTickers}
            />
            {loadingTickers && (
              <span className="absolute right-3 top-3 text-xs text-slate-400">
                Cargando tickers...
              </span>
            )}
            {showTickerDropdown && !loadingTickers && filteredTickers.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-700 bg-slate-900 shadow-lg">
                {filteredTickers.map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    onClick={() => handleSelectTicker(ticker)}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700"
                  >
                    {ticker}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Selecciona de tickers validados en Yahoo Finance
          </p>
        </div>

        <div>
          <label className="ui-label block">Precio Objetivo</label>
          <input
            type="number"
            name="targetPrice"
            step="0.01"
            min="0"
            required
            value={values.targetPrice}
            onChange={(e) => handleChange("targetPrice", e.target.value)}
            className="ui-input mt-1"
            placeholder="100.00"
          />
        </div>

        <div>
          <label className="ui-label block">Condición</label>
          <select
            name="condition"
            required
            value={values.condition}
            onChange={(e) => handleChange("condition", e.target.value as AlertCondition)}
            className="ui-input mt-1"
          >
            <option value="">Selecciona condición</option>
            <option value="GREATER_THAN">Mayor que (&gt;)</option>
            <option value="LESS_THAN">Menor que (&lt;)</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-300/25 bg-rose-700/20 p-4">
          <p className="text-rose-200">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-md border border-emerald-300/25 bg-emerald-700/20 p-4">
          <p className="text-emerald-200">{successMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-2.5 px-4 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creando alerta..." : "Crear alerta"}
      </button>
    </form>
  );
}
