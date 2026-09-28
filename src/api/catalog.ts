import { apiRequest } from "./client";
import type {
  EtkinlikApi,
  KursApi,
  LookupItem,
  PageMeta,
  PortalSayfa,
} from "../types";

export async function fetchPortalSayfalar() {
  const data = await apiRequest<{ items: PortalSayfa[] }>("/portal-sayfalar");
  return data.items;
}

export async function fetchPortalSayfa(slug: string) {
  return apiRequest<PortalSayfa>(`/portal-sayfalar/${encodeURIComponent(slug)}`);
}

export async function fetchPortalSayfaKurslar(
  slug: string,
  query: Record<string, string | number | undefined | null> = {},
) {
  return apiRequest<{ items: KursApi[]; meta: PageMeta }>(
    `/portal-sayfalar/${encodeURIComponent(slug)}/kurslar`,
    { query, auth: true },
  );
}

export async function fetchPortalSayfaEtkinlikler(
  slug: string,
  query: Record<string, string | number | undefined | null> = {},
) {
  return apiRequest<{ items: EtkinlikApi[]; meta: PageMeta }>(
    `/portal-sayfalar/${encodeURIComponent(slug)}/etkinlikler`,
    { query, auth: true },
  );
}

export type PortalSayfaFiltreler = {
  merkezler: LookupItem[];
  alanlar: LookupItem[];
  branslar: LookupItem[];
  kurs_tipleri: LookupItem[];
  etkinlik_tipleri: LookupItem[];
  gunler: number[];
};

export async function fetchPortalSayfaFiltreler(
  slug: string,
  query: Record<string, string | number | undefined | null> = {},
) {
  return apiRequest<PortalSayfaFiltreler>(
    `/portal-sayfalar/${encodeURIComponent(slug)}/filtreler`,
    { query, auth: true },
  );
}

export async function fetchKurslar(query: Record<string, string | number | undefined | null> = {}) {
  return apiRequest<{ items: KursApi[]; meta: PageMeta }>("/kurslar", { query });
}

export async function fetchKurs(id: number | string) {
  return apiRequest<KursApi>(`/kurslar/${id}`, { auth: true });
}

export async function fetchEtkinlikler(
  query: Record<string, string | number | undefined | null> = {},
) {
  return apiRequest<{ items: EtkinlikApi[]; meta: PageMeta }>("/etkinlikler", { query });
}

export async function fetchEtkinlik(id: number | string) {
  return apiRequest<EtkinlikApi>(`/etkinlikler/${id}`, { auth: true });
}

async function lookup(path: string, query?: Record<string, string | number | undefined | null>) {
  const data = await apiRequest<{ items: LookupItem[] }>(path, { query });
  return data.items;
}

export const fetchMerkezler = () => lookup("/lookups/merkezler");
export const fetchAlanlar = () => lookup("/lookups/alanlar");
export const fetchBranslar = (alanId?: number | string) =>
  lookup("/lookups/branslar", { alan_id: alanId });
export const fetchKursTipleri = () => lookup("/lookups/kurs-tipleri");
export const fetchEtkinlikTipleri = () => lookup("/lookups/etkinlik-tipleri");
export const fetchIptalGerekceleri = () => lookup("/lookups/iptal-gerekceleri");
export const fetchIller = () => lookup("/lookups/iller");
export const fetchIlceler = (ilId?: number | string, il?: string) =>
  lookup("/lookups/ilceler", { il_id: ilId, il });
