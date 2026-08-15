import type { PortalSayfa } from "../types";

export const DEFAULT_SLUG: Record<string, string> = {
  kurslar: "kurslar",
  etkinlikler: "etkinlikler",
  basvurularim: "basvurularim",
  profil: "profil",
  "kres-basvuru": "kres",
};

export const LEGACY_SLUGS: Record<string, string[]> = {
  kurslar: ["kurslar"],
  etkinlikler: ["etkinlikler"],
  basvurularim: ["basvurularim"],
  profil: ["profil"],
  "kres-basvuru": ["kres-basvuru", "kres"],
};

export type PortalPaths = {
  kurslar: string;
  kurslarSlug: string;
  kurs: (id: number | string) => string;
  kursBasvuru: (id: number | string) => string;
  etkinlikler: string;
  etkinliklerSlug: string;
  etkinlik: (id: number | string) => string;
  etkinlikBasvuru: (id: number | string) => string;
  basvurularim: string;
  profil: string;
  kres: string;
};

export function normalizePageSlug(
  raw: string | null | undefined,
  fallback: string,
): string {
  const slug = String(raw ?? "").replace(/^\/+|\/+$/g, "");
  return slug || fallback;
}

export function sayfaSlug(sayfalar: PortalSayfa[], kod: string): string {
  const sayfa = sayfalar.find((item) => item.kod === kod);
  return normalizePageSlug(
    sayfa?.slug || sayfa?.path,
    DEFAULT_SLUG[kod] ?? kod,
  );
}

export function sayfaPath(sayfalar: PortalSayfa[], kod: string): string {
  return `/${sayfaSlug(sayfalar, kod)}`;
}

export function buildPortalPaths(sayfalar: PortalSayfa[]): PortalPaths {
  const kurslarSlug = sayfaSlug(sayfalar, "kurslar");
  const etkinliklerSlug = sayfaSlug(sayfalar, "etkinlikler");

  return {
    kurslar: `/${kurslarSlug}`,
    kurslarSlug,
    kurs: (id) => `/${kurslarSlug}/${id}`,
    kursBasvuru: (id) => `/${kurslarSlug}/${id}/basvuru`,
    etkinlikler: `/${etkinliklerSlug}`,
    etkinliklerSlug,
    etkinlik: (id) => `/${etkinliklerSlug}/${id}`,
    etkinlikBasvuru: (id) => `/${etkinliklerSlug}/${id}/basvuru`,
    basvurularim: sayfaPath(sayfalar, "basvurularim"),
    profil: sayfaPath(sayfalar, "profil"),
    kres: sayfaPath(sayfalar, "kres-basvuru"),
  };
}
