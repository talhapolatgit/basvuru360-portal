import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchGenelAyarlar } from "../api/auth";
import { resolveFaviconUrl } from "../api/client";
import { readPersistedJson, writePersistedJson } from "../lib/persist";
import type { GenelAyarlar } from "../types";

const KURUM_CACHE = "b360_kurum";
const DEFAULT_FAVICON = "/favicon.svg";

const fallback: GenelAyarlar = {
  kurum_adi: "Başvuru Portalı",
  telefon: null,
  eposta: null,
  il: null,
  ilce: null,
  adres: null,
  logo_url: null,
  favicon_url: null,
  web_sitesi: null,
  site_aciklama: null,
  sidebar_logo_url: null,
  sidebar_logo_arkaplan: "#ffffff",
  header_logo_url: null,
  sidebar_arkaplan: "#0c2138",
  sidebar_arkaplan_tip: "gradient",
  sidebar_baslik: null,
  sidebar_alt_baslik: null,
  kisi_giris_yontemi: {
    kod: "tc_sifre",
    label: "T.C. Kimlik No + Şifre",
  },
  yakin_icin_basvuru_aktif: true,
  manuel_yakin_ekleme_aktif: true,
  kimlik_sorgulama_aktif: false,
};

type SettingsContextValue = {
  ayarlar: GenelAyarlar;
  loading: boolean;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function readCachedKurum(): GenelAyarlar | null {
  return readPersistedJson<GenelAyarlar>(KURUM_CACHE);
}

function sameAyarlar(a: GenelAyarlar, b: GenelAyarlar): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function applyDocumentHead(ayarlar: GenelAyarlar) {
  const description = ayarlar.site_aciklama?.trim() || "";
  let meta = document.querySelector('meta[name="description"]');
  if (description) {
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);
  } else if (meta) {
    meta.remove();
  }

  let icon = document.querySelector(
    'link[rel="icon"]',
  ) as HTMLLinkElement | null;
  if (!icon) {
    icon = document.createElement("link");
    icon.rel = "icon";
    document.head.appendChild(icon);
  }

  const faviconUrl = resolveFaviconUrl(ayarlar.favicon_url);
  if (faviconUrl) {
    icon.href = faviconUrl;
    icon.removeAttribute("type");
  } else {
    icon.href = DEFAULT_FAVICON;
    icon.type = "image/svg+xml";
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [ayarlar, setAyarlar] = useState<GenelAyarlar>(
    () => readCachedKurum() ?? fallback,
  );
  const [loading, setLoading] = useState(() => readCachedKurum() === null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchGenelAyarlar();
        if (cancelled) return;
        setAyarlar((prev) => (sameAyarlar(prev, data) ? prev : data));
        writePersistedJson(KURUM_CACHE, data);
      } catch {
        if (!cancelled && !readCachedKurum()) {
          setAyarlar(fallback);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applyDocumentHead(ayarlar);
  }, [ayarlar]);

  const value = useMemo(() => ({ ayarlar, loading }), [ayarlar, loading]);

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
