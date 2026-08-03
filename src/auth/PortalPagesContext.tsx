import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchPortalSayfalar } from "../api/catalog";
import { readJsonCookie, writeJsonCookie } from "../lib/cookies";
import type { PortalSayfa } from "../types";

const SAYFALAR_COOKIE = "b360_portal_sayfalar";

type PortalPagesContextValue = {
  sayfalar: PortalSayfa[];
  loading: boolean;
};

const PortalPagesContext = createContext<PortalPagesContextValue | null>(null);

function readCachedSayfalar(): PortalSayfa[] | null {
  const cached = readJsonCookie<PortalSayfa[]>(SAYFALAR_COOKIE);
  if (!Array.isArray(cached)) return null;
  return cached;
}

function sameSayfalar(a: PortalSayfa[], b: PortalSayfa[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function PortalPagesProvider({ children }: { children: ReactNode }) {
  const [sayfalar, setSayfalar] = useState<PortalSayfa[]>(
    () => readCachedSayfalar() ?? [],
  );
  const [loading, setLoading] = useState(() => readCachedSayfalar() === null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await fetchPortalSayfalar();
        if (cancelled) return;
        setSayfalar((prev) => {
          if (sameSayfalar(prev, items)) return prev;
          return items;
        });
        writeJsonCookie(SAYFALAR_COOKIE, items);
      } catch {
        if (!cancelled && !readCachedSayfalar()) {
          setSayfalar([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ sayfalar, loading }),
    [sayfalar, loading],
  );

  return (
    <PortalPagesContext.Provider value={value}>
      {children}
    </PortalPagesContext.Provider>
  );
}

export function usePortalPages() {
  const ctx = useContext(PortalPagesContext);
  if (!ctx) {
    throw new Error("usePortalPages must be used within PortalPagesProvider");
  }
  return ctx;
}
