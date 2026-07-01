"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = inputValue.trim();

    if (!trimmed) {
      setError("El nombre de usuario no puede estar vacío.");
      return;
    }

    if (trimmed.length < 2) {
      setError("El nombre de usuario debe tener al menos 2 caracteres.");
      return;
    }

    if (!/^[\w-]+$/.test(trimmed)) {
      setError("Solo se permiten letras, números, guiones y guiones bajos.");
      return;
    }

    setError("");
    setIsLoading(true);

    // Small delay for UX feedback
    await new Promise((resolve) => setTimeout(resolve, 400));
    login(trimmed);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      {/* Ambient background blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-[80px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
              Sistema listo
            </p>
          </div>

          <h1 className="relative inline-block text-6xl font-extrabold uppercase tracking-tight">
            <span
              aria-hidden="true"
              className="absolute -inset-1 rounded-lg bg-gradient-to-r from-cyan-400/40 via-blue-300/30 to-emerald-300/30 blur-md opacity-60"
            />
            <span className="relative bg-gradient-to-r from-cyan-200 via-slate-100 to-blue-200 bg-clip-text text-transparent drop-shadow-[0_2px_24px_rgba(56,189,248,0.3)]">
              EQUILIBRIO
            </span>
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            Tu gestor de portfolio de inversiones.
          </p>
        </div>

        {/* Login card */}
        <div className="surface-card rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-100">Bienvenido</h2>
            <p className="mt-1 text-sm text-slate-400">
              Ingresá tu nombre de usuario para acceder a tu portfolio.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="userId"
                className="ui-label mb-1.5 block"
              >
                Nombre de usuario
              </label>
              <input
                id="userId"
                type="text"
                autoFocus
                autoComplete="username"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Ej: user-1, juan, maria"
                className="ui-input"
                disabled={isLoading}
              />
              {error && (
                <p className="mt-1.5 text-xs text-rose-400">{error}</p>
              )}
              <p className="mt-1.5 text-[11px] text-slate-500">
                Solo letras, números, guiones y guiones bajos. Sin espacios.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="btn-primary w-full py-3 text-sm font-bold tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Ingresando...
                </span>
              ) : (
                "Ingresar →"
              )}
            </button>
          </form>

          {/* Info section */}
          <div className="mt-6 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              ¿Cómo funciona?
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-cyan-400">→</span>
                Tu usuario es el identificador de tu portfolio personal.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-cyan-400">→</span>
                No se requiere contraseña — es un entorno de uso personal.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-cyan-400">→</span>
                Tu sesión se guarda en el navegador automáticamente.
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Equilibrio · Gestor de Inversiones
        </p>
      </div>
    </div>
  );
}
