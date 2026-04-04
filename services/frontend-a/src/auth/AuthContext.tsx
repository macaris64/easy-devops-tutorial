import type { CreatedUser } from "@easy-devops/user-panel";
import type { ReactElement, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchMe, login as apiLogin, logout as apiLogout } from "../api/gateway";
import { clearTokens, getAccessToken, setTokens } from "./authStorage";

export interface AuthState {
  accessToken: string | null;
  user: CreatedUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    getAccessToken(),
  );
  const [user, setUser] = useState<CreatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  /** Re-read tokens from localStorage (fixes stale React state after DevTools clears storage). */
  const resyncSessionFromStorage = useCallback(() => {
    const t = getAccessToken();
    setAccessToken((prev) => (prev === t ? prev : t));
    if (!t) {
      setUser(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (location.pathname === "/login") {
      resyncSessionFromStorage();
    }
  }, [location.pathname, resyncSessionFromStorage]);

  useEffect(() => {
    function onVisible(): void {
      if (document.visibilityState === "visible") {
        resyncSessionFromStorage();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [resyncSessionFromStorage]);

  const refreshMe = useCallback(async () => {
    const t = getAccessToken();
    if (!t) {
      setUser(null);
      return;
    }
    const me = await fetchMe();
    setUser(me);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!accessToken) {
        setUser(null);
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }
      try {
        await refreshMe();
      } catch {
        clearTokens();
        setAccessToken(null);
        setUser(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshMe]);

  const login = useCallback(async (username: string, password: string) => {
    const out = await apiLogin(username, password);
    setTokens(out.accessToken, out.refreshToken);
    setAccessToken(out.accessToken);
    setUser(out.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      clearTokens();
      setAccessToken(null);
      setUser(null);
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const isAdmin = Boolean(user?.roles?.includes("admin"));

  const value = useMemo(
    () => ({
      accessToken,
      user,
      loading,
      isAdmin,
      login,
      logout,
      refreshMe,
    }),
    [accessToken, user, loading, isAdmin, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Co-located hook for this context; fast-refresh wants hooks separate from providers. */
// eslint-disable-next-line react-refresh/only-export-components -- useAuth is tied to AuthProvider
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
