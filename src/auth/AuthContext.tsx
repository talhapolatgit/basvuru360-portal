import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from "../api/auth";
import { clearTokens, getAccessToken } from "../api/client";
import { deleteCookie, readJsonCookie, writeJsonCookie } from "../lib/cookies";
import type { Kisi } from "../types";

const KISI_COOKIE = "b360_kisi";

function readCachedKisi(): Kisi | null {
  if (!getAccessToken()) {
    deleteCookie(KISI_COOKIE);
    return null;
  }
  return readJsonCookie<Kisi>(KISI_COOKIE);
}

function persistKisi(kisi: Kisi | null) {
  if (kisi) writeJsonCookie(KISI_COOKIE, kisi);
  else deleteCookie(KISI_COOKIE);
}

type AuthContextValue = {
  kisi: Kisi | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (body: Record<string, string>) => Promise<void>;
  register: (body: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  refreshKisi: () => Promise<void>;
  setKisi: (kisi: Kisi | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [kisi, setKisiState] = useState<Kisi | null>(() => readCachedKisi());
  const [loading, setLoading] = useState(() => Boolean(getAccessToken()));

  const setKisi = useCallback((next: Kisi | null) => {
    setKisiState(next);
    persistKisi(next);
  }, []);

  const refreshKisi = useCallback(async () => {
    if (!getAccessToken()) {
      setKisi(null);
      return;
    }
    const me = await fetchMe();
    setKisi(me);
  }, [setKisi]);

  useEffect(() => {
    let cancelled = false;

    if (!getAccessToken()) {
      setKisi(null);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) setKisi(me);
      } catch {
        clearTokens();
        if (!cancelled) setKisi(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setKisi]);

  const login = useCallback(
    async (body: Record<string, string>) => {
      const data = await apiLogin(body);
      setKisi(data.kisi);
    },
    [setKisi],
  );

  const register = useCallback(
    async (body: Record<string, string>) => {
      const data = await apiRegister(body);
      setKisi(data.kisi);
    },
    [setKisi],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setKisi(null);
  }, [setKisi]);

  const value = useMemo(
    () => ({
      kisi,
      loading,
      isAuthenticated: Boolean(kisi),
      login,
      register,
      logout,
      refreshKisi,
      setKisi,
    }),
    [kisi, loading, login, register, logout, refreshKisi, setKisi],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
