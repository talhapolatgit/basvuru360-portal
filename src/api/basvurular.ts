import { apiRequest } from "./client";
import type { BasvuruItem, Kisi } from "../types";

export async function fetchBasvurularim(tip?: "kurs" | "etkinlik") {
  const data = await apiRequest<{ items: BasvuruItem[] }>("/basvurularim", {
    auth: true,
    query: { tip },
  });
  return data.items;
}

export type BasvuruCreateSonuc = {
  basvuru: BasvuruItem;
  durum: string;
  yedek_sira: number | null;
  kisi?: Kisi;
};

export async function createKursBasvuru(formData: FormData) {
  return apiRequest<BasvuruCreateSonuc>("/kurs-basvurulari", {
    method: "POST",
    auth: true,
    formData,
  });
}

export async function createEtkinlikBasvuru(formData: FormData) {
  return apiRequest<BasvuruCreateSonuc>("/etkinlik-basvurulari", {
    method: "POST",
    auth: true,
    formData,
  });
}

export async function iptalKursBasvuru(id: number) {
  return apiRequest<BasvuruItem>(`/kurs-basvurulari/${id}/iptal`, {
    method: "POST",
    auth: true,
    body: {},
  });
}

export async function iptalEtkinlikBasvuru(id: number) {
  return apiRequest<BasvuruItem>(`/etkinlik-basvurulari/${id}/iptal`, {
    method: "POST",
    auth: true,
    body: {},
  });
}
