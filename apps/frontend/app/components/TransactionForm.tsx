"use client";

import { FormEvent, useEffect, useState } from "react";
import { AssetType, TransactionType, ASSET_DICTIONARY } from "@equilibrio/core";
import { TransactionRecord } from "../types";
import { apiUrl } from "../utils/api";
import { useAuth } from "../context/AuthContext";

interface TransactionFormProps {
  onTransactionAdded: (transaction: TransactionRecord) => void;
  onTransactionUpdated: (transaction: TransactionRecord) => void;
  editingTransaction: TransactionRecord | null;
  onCancelEdit: () => void;
}

interface FormValues {
  assetId: string;
  type: TransactionType | "";
  date: string;
  quantity: string;
  price: string;
  commission: string;
}

const EMPTY_VALUES: FormValues = {
  assetId: "",
  type: "",
  date: "",
  quantity: "",
  price: "",
  commission: "",
};

const getAssetTypeFromTicker = (ticker: string): AssetType => {
  const assetDef = ASSET_DICTIONARY[ticker.toUpperCase()];
  return assetDef ? assetDef.type : "ACCION_LOCAL";
};

export default function TransactionForm({
  onTransactionAdded,
  onTransactionUpdated,
  editingTransaction,
  onCancelEdit,
}: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [availableTickers, setAvailableTickers] = useState<string[]>([]);
  const [tickerFilter, setTickerFilter] = useState("");
  const [loadingTickers, setLoadingTickers] = useState(true);
  const [showTickerDropdown, setShowTickerDropdown] = useState(false);

  // Cargar tickers disponibles al montar
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

  useEffect(() => {
    if (!editingTransaction) {
      setValues(EMPTY_VALUES);
      setTickerFilter("");
      return;
    }

    setValues({
      assetId: editingTransaction.assetId,
      type: editingTransaction.type,
      date: new Date(editingTransaction.date).toISOString().slice(0, 10),
      quantity: String(editingTransaction.quantity),
      price: String(editingTransaction.price),
      commission: String(editingTransaction.commission),
    });
    setTickerFilter(editingTransaction.assetId);
  }, [editingTransaction]);

  const isEditing = Boolean(editingTransaction);

  const resetForm = () => {
    setValues(EMPTY_VALUES);
    setTickerFilter("");
  };

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

  const { userId } = useAuth();
  const [fetchingPrice, setFetchingPrice] = useState(false);

  const handleFetchPrice = async () => {
    if (!values.assetId) {
      setError("Primero selecciona un Ticker válido.");
      return;
    }
    setFetchingPrice(true);
    setError(null);
    try {
      const response = await fetch(apiUrl(`/api/market-price/${values.assetId}`));
      if (!response.ok) {
        throw new Error("Error al obtener precio de mercado");
      }
      const data = await response.json();
      if (data.price) {
        handleChange("price", String(data.price));
      } else {
        throw new Error("Precio no encontrado");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!userId) {
      setError("Debes estar logueado para agregar una transacción");
      setLoading(false);
      return;
    }

    if (!values.assetId) {
      setError("Debe seleccionar un ticker válido");
      setLoading(false);
      return;
    }

    if (!values.type) {
      setError("Debe seleccionar el tipo de operación");
      setLoading(false);
      return;
    }

    const assetType = getAssetTypeFromTicker(values.assetId);

    const data = {
      userId,
      assetId: values.assetId.toUpperCase(),
      assetType,
      type: values.type as TransactionType,
      date: new Date(values.date).toISOString(),
      quantity: Number.parseFloat(values.quantity),
      price: Number.parseFloat(values.price),
      commission: Number.parseFloat(values.commission),
    };

    try {
      const transactionId = isEditing ? editingTransaction.id : crypto.randomUUID();
      const endpoint = isEditing
        ? apiUrl(`/api/transactions/${transactionId}`)
        : apiUrl("/api/transactions");

      const payload = isEditing ? data : { id: transactionId, ...data };

      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "No se pudo guardar la transaccion");
      }

      const transaction = (await response.json()) as TransactionRecord;

      if (isEditing) {
        onTransactionUpdated(transaction);
        setSuccessMessage("Transaccion actualizada exitosamente.");
      } else {
        onTransactionAdded(transaction);
        setSuccessMessage("Transaccion agregada exitosamente.");
      }

      resetForm();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="surface-card space-y-4 rounded-xl p-5 md:p-6">
      <h2 className="display-font mb-1 text-3xl text-slate-100">
        {isEditing ? "Editar Transaccion" : "Agregar Transaccion"}
      </h2>
      <p className="text-sm text-slate-400">
        {isEditing
          ? "Ajusta los datos y guarda los cambios."
          : "Registra una operacion nueva en tu portafolio."}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            {showTickerDropdown && !loadingTickers && tickerFilter && filteredTickers.length === 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-slate-700 bg-slate-900 p-3 shadow-lg">
                <p className="text-sm text-slate-400">
                  No se encontraron tickers. Usa uno de la lista sugerida.
                </p>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Selecciona de tickers validados en Yahoo Finance
          </p>
        </div>

        <div>
          <label className="ui-label block">Tipo de operacion</label>
          <select
            name="type"
            required
            value={values.type}
            onChange={(e) => handleChange("type", e.target.value)}
            className="ui-input mt-1"
          >
            <option value="">Selecciona tipo de operacion</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>

        <div>
          <label className="ui-label block">Fecha</label>
          <input
            type="date"
            name="date"
            required
            value={values.date}
            onChange={(e) => handleChange("date", e.target.value)}
            className="ui-input mt-1"
          />
        </div>

        <div>
          <label className="ui-label block">Cantidad</label>
          <input
            type="number"
            name="quantity"
            step="0.01"
            min="0"
            required
            value={values.quantity}
            onChange={(e) => handleChange("quantity", e.target.value)}
            className="ui-input mt-1"
            placeholder="100"
          />
        </div>

        <div>
          <label className="ui-label block flex justify-between items-center">
            Precio 
            <span className="text-xs text-slate-400">
              {values.assetId && getAssetTypeFromTicker(values.assetId) === "CEDEAR" ? "(USD)" : "(ARS)"}
            </span>
          </label>
          <div className="flex gap-2 mt-1">
            <input
              type="number"
              name="price"
              step="0.01"
              min="0"
              required
              value={values.price}
              onChange={(e) => handleChange("price", e.target.value)}
              className="ui-input flex-1"
              placeholder="50.00"
            />
            <button
              type="button"
              onClick={handleFetchPrice}
              disabled={fetchingPrice || !values.assetId}
              className="btn-secondary px-3 text-sm disabled:opacity-50"
              title="Obtener Precio Actual"
            >
              {fetchingPrice ? "..." : "↓ Actual"}
            </button>
          </div>
        </div>

        <div>
          <label className="ui-label block">Comision</label>
          <input
            type="number"
            name="commission"
            step="0.01"
            min="0"
            required
            value={values.commission}
            onChange={(e) => handleChange("commission", e.target.value)}
            className="ui-input mt-1"
            placeholder="0.00"
          />
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

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex-1 py-2.5 px-4 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Agregar transaccion"}
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              onCancelEdit();
            }}
            className="btn-muted px-4 py-2"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
