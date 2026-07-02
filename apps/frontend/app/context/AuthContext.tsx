"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiUrl } from "../utils/api";

const TOKEN_KEY = "equilibrio_auth_token";

interface AuthContextValue {
  userId: string | null;
  displayName: string | null;
  token: string | null;
  isReady: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

interface LoginResponse {
  token: string;
  userId: string;
  displayName: string;
}

// Decode JWT payload without verifying signature (verification is on the backend)
function decodeJwtPayload(token: string): { userId: string; displayName: string; exp: number } | null {
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return null;
    const decoded = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as { userId: string; displayName: string; exp: number };
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  return Date.now() >= payload.exp * 1000;
}

const AuthContext = createContext<AuthContextValue>({
  userId: null,
  displayName: null,
  token: null,
  isReady: false,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored && !isTokenExpired(stored)) {
      const payload = decodeJwtPayload(stored);
      if (payload) {
        setToken(stored);
        setUserId(payload.userId);
        setDisplayName(payload.displayName);
      }
    } else if (stored) {
      // Token expired — clean up
      localStorage.removeItem(TOKEN_KEY);
    }
    setIsReady(true);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { message?: string };
      throw new Error(errorData.message ?? "Error al iniciar sesión");
    }

    const data = (await response.json()) as LoginResponse;
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUserId(data.userId);
    setDisplayName(data.displayName);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUserId(null);
    setDisplayName(null);
  }, []);

  return (
    <AuthContext.Provider value={{ userId, displayName, token, isReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
