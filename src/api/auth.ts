import { apiRequest, setTokens, clearTokens, type RequestOptions } from "./client";
import type { AuthTokens, GenelAyarlar, GirisYontemiKod, Kisi } from "../types";

export type AuthResult = AuthTokens & {
  kisi: Kisi;
  giris_yontemi?: { kod: GirisYontemiKod; label: string };
};

export async function fetchGenelAyarlar(): Promise<GenelAyarlar> {
  return apiRequest<GenelAyarlar>("/genel-ayarlar");
}

export async function login(body: Record<string, string>): Promise<AuthResult> {
  const data = await apiRequest<AuthResult>("/auth/login", {
    method: "POST",
    body,
  });
  setTokens(data.access_token, data.refresh_token);
  return data;
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
