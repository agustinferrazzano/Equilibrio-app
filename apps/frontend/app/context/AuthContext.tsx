"use client";

import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
import { createContext, useContext } from "react";

interface AuthContextValue {
  userId: string | null;
  displayName: string | null;
  token: string | null;
  isReady: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  userId: null,
  displayName: null,
  token: null,
  isReady: false,
  login: async () => {},
  loginWithGoogle: async () => {},
  logout: () => {},
});

function AuthContextInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const isReady = status !== "loading";
  // @ts-ignore - Custom session properties added in NextAuth callback
  const userId = session?.user?.id ?? null;
  const displayName = session?.user?.name ?? null;
  // @ts-ignore
  const token = session?.accessToken ?? null;

  const login = async (username: string, password: string) => {
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    if (result?.error) {
      throw new Error("Credenciales inválidas");
    }
  };

  const loginWithGoogle = async () => {
    await signIn("google");
  };

  const logout = () => {
    signOut({ redirect: false });
  };

  return (
    <AuthContext.Provider value={{ userId, displayName, token, isReady, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextInner>{children}</AuthContextInner>
    </SessionProvider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
