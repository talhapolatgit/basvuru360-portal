import { apiBlob, apiRequest } from "./client";

export type EvrakDurum = {
  kod: string | null;
  ad: string;
};

export type EvrakItem = {
  id: number;
  evrak_tipi: string;
  adina: string | null;
  dosya_adi: string;
  mime: string | null;
  boyut: number;
  boyut_metin: string;
  durum: EvrakDurum;
  son_gecerlilik_tarihi: string | null;
  son_gecerlilik_metin: string;
  yuklenme_tarihi: string | null;
};

export type EvrakBasvuru = {
  tip: "kurs" | "etkinlik";
  tip_etiket: string;
  basvuru_id: number;
  baslik: string;
  kayit_no_etiket: string;
  kayit_no: string | number | null;
  alt: string | null;
  durum: string | null;
  katilimci: string | null;
  tarih: string | null;
};

export type EvrakDetay = EvrakItem & {
  basvurular: EvrakBasvuru[];
};

export async function fetchEvraklarim() {
  const data = await apiRequest<{ items: EvrakItem[] }>("/evraklarim", {
    auth: true,
  });
  return data.items;
}

export async function fetchEvrakDetay(id: number) {
  return apiRequest<EvrakDetay>(`/evraklarim/${id}`, { auth: true });
}

export async function fetchEvrakDosya(id: number) {
  return apiBlob(`/evraklarim/${id}/dosya`, { auth: true });
}

export type SecilebilirEvrak = {
  id: number;
  evrak_tipi_id: number;
  evrak_tipi: string;
  durum: EvrakDurum;
  son_gecerlilik_tarihi: string | null;
  son_gecerlilik_metin: string;
  yuklenme_tarihi: string | null;
};

export async function fetchSecilebilirEvraklar(kisiId?: number | null) {
  const params = new URLSearchParams();
  if (kisiId) params.set("kisi_id", String(kisiId));
  const query = params.toString();
  const data = await apiRequest<{ items: SecilebilirEvrak[] }>(
    `/evraklarim/secilebilir${query ? `?${query}` : ""}`,
    { auth: true },
  );
  return data.items;
}
