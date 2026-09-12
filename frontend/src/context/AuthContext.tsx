import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@shared/types";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/apiClient";
import { clearToken, getToken, setToken } from "@/lib/auth";
import { useResumeRevalidation } from "@/hooks/useResumeRevalidation";

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

// Retry backoff for a `getUser` that fails for a reason that is *not* "this
// token is invalid" — a dropped connection on tab resume, a cold start, a
// blip. Doubles each attempt up to the cap; resets on success.
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 30_000;
// A tab switch/focus/online event often fires several of those at once, and
// a laptop waking from sleep can fire a burst of them — one real check is
// enough.
const RESUME_THROTTLE_MS = 5000;

export function AuthProvider({ children }: { children: ReactNode }) {
  // Start "loading" only if there's a token to validate; otherwise we already
  // know the user is anonymous and can render the public UI immediately.
  const [status, setStatus] = useState<AuthStatus>(() => (getToken() ? "loading" : "anonymous"));
  const [user, setUser] = useState<User | null>(null);

  const alive = useRef(true);
  const inFlight = useRef(false);
  const attempt = useRef(0);
  const retryTimer = useRef<number | null>(null);
  const lastCheck = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
    };
  }, []);

  const clearRetry = () => {
    if (retryTimer.current !== null) {
      window.clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    attempt.current = 0;
  };

  /**
   * Validate the stored token against `/getuser`. This is the one place that
   * decides authenticated vs. anonymous, and it is deliberately careful about
   * *why* a call failed:
   *
   *  - a real 401 means the token itself is rejected — that is a genuine,
   *    confirmed "you are logged out", so the token is cleared and status
   *    becomes "anonymous".
   *  - anything else (network failure, a timeout, a 5xx, a CORS hiccup after
   *    the laptop wakes up) says nothing about the token's validity. It is
   *    retried with backoff instead. If this is the very first check (no
   *    session established yet), status stays "loading" — never flips to
   *    "anonymous" just because the server didn't answer in time. If a
   *    session was already established, status is left completely alone: the
   *    UI stays on the authenticated view, silently, and this function will
   *    be called again by the backoff timer or the next resume event.
   */
  const checkAuth = useCallback(async () => {
    if (!getToken() || inFlight.current) return;
    inFlight.current = true;
    lastCheck.current = Date.now();
    try {
      const u = await api.getUser();
      if (!alive.current) return;
      clearRetry();
      setUser(u);
      setStatus("authenticated");
    } catch (err) {
      if (!alive.current) return;
      if (err instanceof ApiError && err.status === 401) {
        clearRetry();
        clearToken();
        setUser(null);
        setStatus("anonymous");
        return;
      }
      // Transient — never interpret as "signed out".
      setStatus((s) => (s === "authenticated" ? s : "loading"));
      const delay = Math.min(RETRY_BASE_MS * 2 ** attempt.current, RETRY_MAX_MS);
      attempt.current += 1;
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
      retryTimer.current = window.setTimeout(() => void checkAuth(), delay);
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Initial rehydration.
  useEffect(() => {
    void checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tab resumed / regained focus / network back — a quiet re-check, throttled
  // so normal switching between tabs never turns into a request storm. This
  // is what lets a token that briefly failed to validate (or an already-good
  // session) get confirmed again without the user doing anything.
  useResumeRevalidation(
    useCallback(() => {
      if (!getToken()) return;
      if (Date.now() - lastCheck.current < RESUME_THROTTLE_MS) return;
      void checkAuth();
    }, [checkAuth]),
  );

  const login = useCallback(async (email: string, password: string) => {
    const token = await api.login({ email, password });
    setToken(token);
    clearRetry();
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
    clearRetry();
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
