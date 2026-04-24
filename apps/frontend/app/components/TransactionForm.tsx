"use client";

import { FormEvent, useEffect, useState } from "react";
import { TransactionType } from "@equilibrio/core";
import { TransactionRecord } from "../types";

interface TransactionFormProps {
  onTransactionAdded: (transaction: TransactionRecord) => void;
  onTransactionUpdated: (transaction: TransactionRecord) => void;
  editingTransaction: TransactionRecord | null;
  onCancelEdit: () => void;
}

interface FormValues {
  id: string;
  userId: string;
  assetId: string;
  type: TransactionType | "";
  date: string;
  quantity: string;
  price: string;
  commission: string;
}

const EMPTY_VALUES: FormValues = {
  id: "",
  userId: "",
  assetId: "",
  type: "",
  date: "",
  quantity: "",
  price: "",
  commission: "",
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

  useEffect(() => {
    if (!editingTransaction) {
      setValues(EMPTY_VALUES);
      return;
    }

    setValues({
      id: editingTransaction.id,
      userId: editingTransaction.userId,
      assetId: editingTransaction.assetId,
      type: editingTransaction.type,
      date: new Date(editingTransaction.date).toISOString().slice(0, 10),
      quantity: String(editingTransaction.quantity),
      price: String(editingTransaction.price),
      commission: String(editingTransaction.commission),
    });
  }, [editingTransaction]);

  const isEditing = Boolean(editingTransaction);

  const resetForm = () => {
    setValues(EMPTY_VALUES);
  };

  const handleChange = (field: keyof FormValues, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const data = {
      userId: values.userId,
      assetId: values.assetId,
      type: values.type as TransactionType,
      date: new Date(values.date).toISOString(),
      quantity: Number.parseFloat(values.quantity),
      price: Number.parseFloat(values.price),
      commission: Number.parseFloat(values.commission),
    };

    try {
      const endpoint = isEditing
        ? `http://localhost:3001/api/transactions/${values.id}`
        : "http://localhost:3001/api/transactions";

      const payload = isEditing ? data : { id: values.id, ...data };

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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="ui-label block">ID</label>
          <input
            type="text"
            name="id"
            required
            value={values.id}
            onChange={(e) => handleChange("id", e.target.value)}
            disabled={isEditing}
            className="ui-input mt-1 disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="tx-1"
          />
        </div>

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

        <div>
          <label className="ui-label block">Asset ID</label>
          <input
            type="text"
            name="assetId"
            required
            value={values.assetId}
            onChange={(e) => handleChange("assetId", e.target.value)}
            className="ui-input mt-1"
            placeholder="asset-1"
          />
        </div>

        <div>
          <label className="ui-label block">Tipo</label>
          <select
            name="type"
            required
            value={values.type}
            onChange={(e) => handleChange("type", e.target.value)}
            className="ui-input mt-1"
          >
            <option value="">Selecciona un tipo</option>
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
          <label className="ui-label block">Precio</label>
          <input
            type="number"
            name="price"
            step="0.01"
            min="0"
            required
            value={values.price}
            onChange={(e) => handleChange("price", e.target.value)}
            className="ui-input mt-1"
            placeholder="50.00"
          />
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
