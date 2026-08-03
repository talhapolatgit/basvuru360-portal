import { useEffect, useState } from "react";
import { fetchPortalSayfa } from "../api/catalog";
import { usePortalPages } from "../auth/PortalPagesContext";
import type { PortalSayfa } from "../types";

/** Menüde gizli olsa bile sayfa meta bilgisini getirir. */
export function usePortalSayfaMeta(
  kod: string,
  fallback: { baslik: string; aciklama: string },
) {
  const { sayfalar } = usePortalPages();
  const fromList = sayfalar.find((s) => s.kod === kod) ?? null;
  const [sayfa, setSayfa] = useState<PortalSayfa | null>(fromList);

  useEffect(() => {
    if (fromList) {
      setSayfa(fromList);
      return;
    }

    let cancelled = false;
    void fetchPortalSayfa(kod)
      .then((data) => {
        if (!cancelled) setSayfa(data);
      })
      .catch(() => {
        if (!cancelled) setSayfa(null);
      });

    return () => {
      cancelled = true;
    };
  }, [kod, fromList]);

  return {
    baslik: sayfa?.baslik?.trim() || fallback.baslik,
    aciklama: sayfa?.aciklama?.trim() || fallback.aciklama,
    sayfa,
  };
}
