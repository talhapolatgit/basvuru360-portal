import { apiRequest, setTokens, clearTokens, type RequestOptions } from "./client";
import type { AuthTokens, GenelAyarlar, GirisYontemiKod, Kisi } from "../types";

export type AuthResult = AuthTokens & {
  kisi: Kisi;
  giris_yontemi?: { kod: GirisYontemiKod; label: string };
};

export async function fetchGenelAyarlar(): Promise<GenelAyarlar> {
  return apiRequest<GenelAyarlar>("/genel-ayarlar");
}

export type DogrulamaHedefi = { kanal: "sms" | "eposta"; hedef: string };

export type IkiAsamaliBilgi = {
  hedefler: DogrulamaHedefi[];
  ttl_dakika: number;
  yeniden_gonderim_saniye: number;
};

export type IkiAsamaliDogrulama = IkiAsamaliBilgi & {
  iki_asamali: true;
  dogrulama_token: string;
};

export async function login(
  body: Record<string, string>,
): Promise<AuthResult | IkiAsamaliDogrulama> {
  const data = await apiRequest<AuthResult | IkiAsamaliDogrulama>("/auth/login", {
    method: "POST",
    body,
  });
  if ("iki_asamali" in data) return data;
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function loginDogrula(body: {
  dogrulama_token: string;
  kod: string;
}): Promise<AuthResult> {
  const data = await apiRequest<AuthResult>("/auth/login/dogrulama", {
    method: "POST",
    body,
  });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function loginKodYenile(dogrulama_token: string): Promise<IkiAsamaliBilgi> {
  return apiRequest<IkiAsamaliBilgi>("/auth/login/dogrulama/yenile", {
    method: "POST",
    body: { dogrulama_token },
  });
}

export async function register(body: Record<string, string>): Promise<AuthResult> {
  const data = await apiRequest<AuthResult>("/auth/register", {
    method: "POST",
    body,
  });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function fetchMe(): Promise<Kisi> {
  return apiRequest<Kisi>("/auth/me", { auth: true });
}

export type KisiYakinItem = {
  id: number;
  ad: string;
  soyad: string;
  tam_adi: string;
  tc_kimlik_no: string | null;
  dogum_tarihi: string | null;
  cinsiyet: "erkek" | "kadin" | null;
  yakinlik_derecesi: string | null;
  yakinlik_label: string | null;
};

export async function fetchYakinlar(): Promise<KisiYakinItem[]> {
  const data = await apiRequest<{ items: KisiYakinItem[] }>("/auth/yakinlar", {
    auth: true,
  });
  return data.items;
}

export async function updateProfil(
  body: Record<string, string | null>,
): Promise<Kisi> {
  return apiRequest<Kisi>("/auth/profil", {
    method: "PUT",
    auth: true,
    body,
  });
}

export async function updateSifre(body: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  await apiRequest<null>("/auth/sifre", {
    method: "PUT",
    auth: true,
    body,
  });
}

export async function logout(): Promise<void> {
  const opts: RequestOptions = {
    method: "POST",
    auth: true,
    body: {},
    skipRefresh: true,
  };
  try {
    const refresh = localStorage.getItem("b360_refresh_token");
    if (refresh) opts.body = { refresh_token: refresh };
    await apiRequest<null>("/auth/logout", opts);
  } catch {
    // ignore
  } finally {
    clearTokens();
  }
}
