"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardSummary from "./components/DashboardSummary";
import PortfolioEvolutionChart from "./components/PortfolioEvolutionChart";
import TransactionForm from "./components/TransactionForm";
import TransactionList from "./components/TransactionList";
import PriceAlertForm from "./components/PriceAlertForm";
import AlertList from "./components/AlertList";
import LoginPage from "./components/LoginPage";
import { useAuth } from "./context/AuthContext";
import { PaginatedTransactionsResponse, TransactionRecord } from "./types";
import { apiUrl } from "./utils/api";

type SortBy = "date" | "price" | "quantity";
type SortOrder = "asc" | "desc";
type ToastState = { type: "success" | "error"; message: string } | null;

export default function Home() {
  const { userId: authUserId, isReady, logout } = useAuth();

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<TransactionRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertFormOpen, setIsAlertFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterAssetId, setFilterAssetId] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [alertUserId, setAlertUserId] = useState("");
  const [alertsRefreshToken, setAlertsRefreshToken] = useState(0);

  // Sync filterUserId with authenticated user on load
  useEffect(() => {
    if (authUserId) {
      setFilterUserId(authUserId);
      setAlertUserId(authUserId);
    }
  }, [authUserId]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fetchTransactions = async () => {
    setLoadingList(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortOrder,
      });

      if (filterUserId.trim()) {
        params.set("userId", filterUserId.trim());
      }

      if (filterAssetId.trim()) {
        params.set("assetId", filterAssetId.trim());
      }

      const response = await fetch(apiUrl(`/api/transactions?${params.toString()}`));
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as PaginatedTransactionsResponse;
      setTransactions(payload.data);
      setTotal(payload.total);
    } catch {
      // Keep page usable even if backend is down.
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, pageSize, sortBy, sortOrder, filterUserId, filterAssetId, reloadToken]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (editingTransaction) {
      setIsFormOpen(true);
    }
  }, [editingTransaction]);

  const refreshCurrentPage = () => {
    setReloadToken((previous) => previous + 1);
  };

  const handleTransactionAdded = (_transaction: TransactionRecord) => {
    setPage(1);
    setIsFormOpen(false);
    refreshCurrentPage();
  };

  const handleTransactionUpdated = (_transaction: TransactionRecord) => {
    setEditingTransaction(null);
    setIsFormOpen(false);
    refreshCurrentPage();
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) {
      return;
    }

    try {
      setDeletingId(pendingDeleteId);
      const response = await fetch(apiUrl(`/api/transactions/${pendingDeleteId}`), {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        throw new Error(errorData.message || "No se pudo eliminar la transaccion");
      }

      setToast({ type: "success", message: "Transaccion eliminada exitosamente." });
      if (editingTransaction?.id === pendingDeleteId) {
        setEditingTransaction(null);
      }
      refreshCurrentPage();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al eliminar";
      setToast({ type: "error", message });
    } finally {
      setPendingDeleteId(null);
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setFilterAssetId("");
    setSortBy("date");
    setSortOrder("desc");
    // Keep filterUserId pinned to authenticated user
    setFilterUserId(authUserId ?? "");
    setPage(1);
  };

  // Show loading shimmer while localStorage is being read
  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  // Show login page if not authenticated
  if (!authUserId) {
    return <LoginPage />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />
      <div className="pointer-events-none absolute top-16 -right-16 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-[96rem]">
        <header className="mb-8 md:mb-10">
          {/* Top bar: brand pill + logout */}
          <div className="flex items-center justify-between">
            <div className="flex w-fit items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.9)]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">System online</p>
            </div>
            {/* User badge + logout */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-xs font-semibold text-emerald-300">{authUserId}</span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="btn-muted rounded-full px-3 py-1.5 text-xs"
                title="Cerrar sesión"
              >
                Salir
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="mt-6 text-center">
            <div className="mt-2 flex justify-center">
              <h1 className="relative inline-block text-6xl font-extrabold uppercase tracking-[0.02em] leading-tight md:text-7xl">
                <span aria-hidden="true" className="absolute -inset-1 blur-md opacity-55 bg-gradient-to-r from-cyan-400/45 via-blue-300/35 to-emerald-300/35" />
                <span className="relative bg-gradient-to-r from-cyan-200 via-slate-100 to-blue-200 bg-clip-text text-transparent drop-shadow-[0_2px_24px_rgba(56,189,248,0.32)]">
                  EQUILIBRIO
                </span>
              </h1>
            </div>

            <div className="mx-auto mt-2 flex w-fit items-center gap-3">
              <span className="h-px w-14 bg-gradient-to-r from-transparent to-cyan-300/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/90" />
              <span className="h-px w-14 bg-gradient-to-l from-transparent to-cyan-300/70" />
            </div>

            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 md:text-base">
              Controla movimientos de compra y venta con una interfaz limpia, segura y preparada para crecimiento.
            </p>
          </div>
        </header>

        <div className="space-y-4">
          <div className="surface-panel flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 md:p-5">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
                Gestion de transacciones
              </h3>
              <p className="mt-1 text-sm text-slate-400">Abre el formulario solo cuando lo necesites.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isFormOpen && editingTransaction) {
                    setEditingTransaction(null);
                  }
                  setIsFormOpen((previous) => !previous);
                }}
                className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                {isFormOpen ? "Cerrar formulario" : "Agregar transaccion"}
              </button>
              <button
                type="button"
                onClick={() => setIsAlertFormOpen((previous) => !previous)}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
              >
                {isAlertFormOpen ? "Cerrar alertas" : "🔔 Gestionar alertas"}
              </button>
            </div>
          </div>

          <div className="surface-panel mb-4 space-y-4 rounded-xl p-4 md:p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">Filtros y orden</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Filtrar por userId"
                  value={filterUserId}
                  onChange={(e) => {
                    setFilterUserId(e.target.value);
                    setPage(1);
                  }}
                  className="ui-input"
                />
                <input
                  type="text"
                  placeholder="Filtrar por assetId"
                  value={filterAssetId}
                  onChange={(e) => {
                    setFilterAssetId(e.target.value);
                    setPage(1);
                  }}
                  className="ui-input"
                />
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortBy);
                    setPage(1);
                  }}
                  className="ui-input"
                >
                  <option value="date">Ordenar por fecha</option>
                  <option value="price">Ordenar por precio</option>
                  <option value="quantity">Ordenar por cantidad</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value as SortOrder);
                    setPage(1);
                  }}
                  className="ui-input"
                >
                  <option value="desc">Descendente</option>
                  <option value="asc">Ascendente</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-400">Page size:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number.parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                    className="ui-input py-1 text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-muted px-3 py-1 text-sm"
                >
                  Limpiar filtros
                </button>
              </div>
          </div>

          <TransactionList
            transactions={transactions}
            onEdit={setEditingTransaction}
            onRequestDelete={setPendingDeleteId}
            deletingId={deletingId}
          />

          <div className="surface-panel mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
            <p className="text-sm text-slate-400">
              Mostrando {transactions.length} de {total} resultados
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loadingList}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                className="btn-muted px-3 py-1 text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-300">
                Pagina {page} de {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loadingList}
                onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
                className="btn-muted px-3 py-1 text-sm disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>

          <DashboardSummary
            refreshToken={reloadToken}
            filterUserId={authUserId}
            filterAssetId={filterAssetId}
          />

          <PortfolioEvolutionChart userId={authUserId} />
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-xl border border-slate-700/70 bg-slate-900/95 p-4 shadow-2xl md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
                {editingTransaction ? "Editar transaccion" : "Nueva transaccion"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingTransaction(null);
                  setIsFormOpen(false);
                }}
                className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>

            <TransactionForm
              onTransactionAdded={handleTransactionAdded}
              onTransactionUpdated={handleTransactionUpdated}
              editingTransaction={editingTransaction}
              onCancelEdit={() => {
                setEditingTransaction(null);
                setIsFormOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {isAlertFormOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-xl border border-slate-700/70 bg-slate-900/95 p-4 shadow-2xl md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
                  🔔 Gestión de alertas de precio
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Creá nuevas alertas y gestioná las activas desde acá.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAlertFormOpen(false)}
                className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>

            {/* Shared userId input */}
            <div className="mb-5 rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3">
              <label className="ui-label block mb-1">User ID (compartido)</label>
              <input
                type="text"
                value={alertUserId}
                onChange={(e) => setAlertUserId(e.target.value)}
                placeholder="Ej: user-1"
                className="ui-input"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Este ID se usará tanto para crear la alerta como para listar las existentes.
              </p>
            </div>

            {/* Create alert form */}
            <div className="mb-5">
              <PriceAlertForm
                initialUserId={alertUserId}
                onUserIdChange={setAlertUserId}
                onAlertCreated={(createdUserId) => {
                  setAlertUserId(createdUserId);
                  setAlertsRefreshToken((t) => t + 1);
                }}
              />
            </div>

            {/* Divider */}
            <div className="mb-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-700/60" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Alertas existentes</span>
              <div className="h-px flex-1 bg-slate-700/60" />
            </div>

            {/* Active alerts list */}
            <AlertList
              userId={alertUserId}
              refreshToken={alertsRefreshToken}
            />
          </div>
        </div>
      )}

      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-md space-y-4 rounded-xl p-6">
            <h3 className="display-font text-2xl text-slate-100">Confirmar eliminacion</h3>
            <p className="text-slate-300">
              Esta accion eliminara la transaccion <strong>{pendingDeleteId}</strong>. No se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="btn-muted px-4 py-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingId !== null}
                className="rounded-md bg-rose-700 px-4 py-2 text-white transition hover:bg-rose-600 disabled:opacity-50"
              >
                {deletingId ? "Eliminando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed right-4 top-4 z-50">
          <div
            className={`rounded-lg border px-4 py-3 text-sm text-white shadow-lg backdrop-blur ${
              toast.type === "success"
                ? "border-emerald-300/25 bg-emerald-700/85"
                : "border-rose-300/25 bg-rose-700/85"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

