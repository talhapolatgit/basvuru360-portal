import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchPortalSayfalar } from "../api/catalog";
import { readPersistedJson, writePersistedJson } from "../lib/persist";
import { buildPortalPaths, type PortalPaths } from "../lib/portalPaths";
import type { PortalSayfa } from "../types";

const SAYFALAR_CACHE = "b360_portal_sayfalar";

type PortalPagesContextValue = {
  sayfalar: PortalSayfa[];
  loading: boolean;
  paths: PortalPaths;
};

const PortalPagesContext = createContext<PortalPagesContextValue | null>(null);

function normalizeSayfalar(items: PortalSayfa[]): PortalSayfa[] {
  return items.map((item) => ({
    ...item,
    sadece_giris: Boolean(item.sadece_giris),
  }));
}

function readCachedSayfalar(): PortalSayfa[] | null {
  const cached = readPersistedJson<PortalSayfa[]>(SAYFALAR_CACHE);
  if (!Array.isArray(cached)) return null;
  return normalizeSayfalar(cached);
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
        const items = normalizeSayfalar(await fetchPortalSayfalar());
        if (cancelled) return;
        setSayfalar((prev) => {
          if (sameSayfalar(prev, items)) return prev;
          return items;
        });
        writePersistedJson(SAYFALAR_CACHE, items);
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
    () => ({ sayfalar, loading, paths: buildPortalPaths(sayfalar) }),
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
