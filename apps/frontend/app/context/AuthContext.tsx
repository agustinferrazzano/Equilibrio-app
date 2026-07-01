"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "equilibrio_user_id";

interface AuthContextValue {
  userId: string | null;
  isReady: boolean;
  login: (userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  userId: null,
  isReady: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  // Avoid hydration mismatch: don't read localStorage until mounted on client
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setUserId(stored);
    setIsReady(true);
  }, []);

  const login = useCallback((id: string) => {
    const trimmed = id.trim();
    localStorage.setItem(STORAGE_KEY, trimmed);
    setUserId(trimmed);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUserId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ userId, isReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
