import { apiDownload, apiRequest } from "./client";
import type { IkiAsamaliBilgi } from "./auth";
import type {
  BasvuruItem,
  Kisi,
  KresBasvuruDurum,
  KresGrupSecim,
  KresOkulSecim,
  KresSoruFormuPayload,
} from "../types";

export async function fetchBasvurularim(tip?: "kurs" | "etkinlik" | "kres") {
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

export type BasvuruDogrulamaOturumu = IkiAsamaliBilgi & { dogrulama_token: string };

export async function basvuruDogrulamaKoduGonder() {
  return apiRequest<BasvuruDogrulamaOturumu>("/basvuru-dogrulama/kod", {
    method: "POST",
    auth: true,
    body: {},
  });
}

export async function basvuruDogrulamaKoduYenile(dogrulama_token: string) {
  return apiRequest<IkiAsamaliBilgi>("/basvuru-dogrulama/kod/yenile", {
    method: "POST",
    auth: true,
    body: { dogrulama_token },
  });
}

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

export async function downloadKursBelge(id: number) {
  return apiDownload(`/kurs-basvurulari/${id}/belge`, {
    auth: true,
    fallbackFilename: `belge-${id}.pdf`,
  });
}

export async function fetchKresBasvuruDurum() {
  return apiRequest<KresBasvuruDurum>("/kres-basvuru", { auth: true });
}

export async function fetchKresOkullar(ogrenciDogumTarihi: string) {
  const data = await apiRequest<{
    items: KresOkulSecim[];
    ogrenci_yas: number;
  }>("/kres-basvuru/okullar", {
    auth: true,
    query: { ogrenci_dogum_tarihi: ogrenciDogumTarihi },
  });
  return data;
}

export async function fetchKresGruplar(
  okulId: number,
  ogrenciDogumTarihi: string,
) {
  return apiRequest<{
    okul: { id: number; ad: string; adres: string | null };
    items: KresGrupSecim[];
    ogrenci_yas: number;
  }>(`/kres-basvuru/okullar/${okulId}/gruplar`, {
    auth: true,
    query: { ogrenci_dogum_tarihi: ogrenciDogumTarihi },
  });
}

export async function fetchKresSoruFormu() {
  return apiRequest<KresSoruFormuPayload>("/kres-basvuru/soru-formu", {
    auth: true,
  });
}

export async function createKresBasvuru(formData: FormData) {
  return apiRequest<{ basvuru: BasvuruItem; durum: string | null }>(
    "/kres-basvuru",
    {
      method: "POST",
      auth: true,
      formData,
    },
  );
}
