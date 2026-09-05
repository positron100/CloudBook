import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@shared/types";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/apiClient";
import { clearToken, getToken, setToken } from "@/lib/auth";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Start "loading" only if there's a token to validate; otherwise we already
  // know the user is anonymous and can render the public UI immediately.
  const [status, setStatus] = useState<AuthStatus>(() => (getToken() ? "loading" : "anonymous"));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    const controller = new AbortController();
    api
      .getUser(controller.signal)
      .then((u) => {
        setUser(u);
        setStatus("authenticated");
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // 401 -> stale/invalid token. Any other error (network, 500): also fall
        // back to anonymous rather than trapping the user on a blank screen.
        if (err instanceof ApiError && err.status === 401) clearToken();
        setUser(null);
        setStatus("anonymous");
      });
    return () => controller.abort();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const token = await api.login({ email, password });
    setToken(token);
    const u = await api.getUser().catch(() => null);
    setUser(u);
    setStatus("authenticated");
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    // Backend returns a token on signup but the pre-revamp flow required a
    // separate login afterwards. Keep that behavior: don't persist this token.
    await api.signup({ name, email, password });
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === "authenticated",
      login,
      signup,
      logout,
    }),
    [status, user, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
