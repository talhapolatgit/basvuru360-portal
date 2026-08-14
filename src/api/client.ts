const STORAGE_ACCESS = "b360_access_token";
const STORAGE_REFRESH = "b360_refresh_token";

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]> | null;

  constructor(
    message: string,
    status: number,
    errors: Record<string, string[]> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }

  /** Alan doğrulama mesajlarının düz listesi (tekrarsız). */
  detailMessages(): string[] {
    if (!this.errors) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const msgs of Object.values(this.errors)) {
      for (const msg of msgs) {
        const text = String(msg ?? "").trim();
        if (!text || seen.has(text)) continue;
        seen.add(text);
        list.push(text);
      }
    }
    return list;
  }
}

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
};

function baseUrl(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  // Varsayılan: Vite proxy (/api → Laravel). Aynı origin = localhost ve LAN çalışır.
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/api/v1`;
  }

  return "/api/v1";
}

export function apiBaseUrl(): string {
  return baseUrl();
}

/** API görsellerini portalın bildiği API host üzerinden ister. */
export function resolveApiImageUrl(
  imageUrl: string | null | undefined,
  path: "logo" | "sidebar-logo" | "header-logo" | "favicon",
): string | null {
  if (!imageUrl?.trim()) return null;

  const base = baseUrl();
  try {
    const parsed = new URL(imageUrl, `${base}/`);
    const version = parsed.searchParams.get("v");
    return `${base}/${path}${version ? `?v=${encodeURIComponent(version)}` : ""}`;
  } catch {
    return `${base}/${path}`;
  }
}

/** Portal sayfa görsellerini (logo/ikon) aynı API origin üzerinden çözer. */
export function resolvePortalAssetUrl(
  imageUrl: string | null | undefined,
): string | null {
  if (!imageUrl?.trim()) return null;

  const base = baseUrl();
  try {
    const parsed = new URL(imageUrl, `${base}/`);
    const match = parsed.pathname.match(/\/api\/v1\/(.+)/);
    if (match) {
      return `${base}/${match[1]}${parsed.search}`;
    }
    return parsed.toString();
  } catch {
    return imageUrl;
  }
}

export function resolveLogoUrl(logoUrl: string | null | undefined): string | null {
  return resolveApiImageUrl(logoUrl, "logo");
}

export function resolveSidebarLogoUrl(
  logoUrl: string | null | undefined,
): string | null {
  return resolveApiImageUrl(logoUrl, "sidebar-logo");
}

export function resolveHeaderLogoUrl(
  logoUrl: string | null | undefined,
): string | null {
  return resolveApiImageUrl(logoUrl, "header-logo");
}

export function resolveFaviconUrl(
  faviconUrl: string | null | undefined,
): string | null {
  return resolveApiImageUrl(faviconUrl, "favicon");
}

export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_ACCESS);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_REFRESH);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(STORAGE_ACCESS, access);
  localStorage.setItem(STORAGE_REFRESH, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_ACCESS);
  localStorage.removeItem(STORAGE_REFRESH);
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const res = await fetch(`${baseUrl()}/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    const json = (await res.json()) as ApiEnvelope<{
      access_token: string;
      refresh_token: string;
    }>;
    if (!res.ok || !json.success || !json.data?.access_token) {
      clearTokens();
      return false;
    }
    setTokens(json.data.access_token, json.data.refresh_token);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  formData?: FormData;
  query?: Record<string, string | number | undefined | null>;
  skipRefresh?: boolean;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    auth = false,
    formData,
    query,
    skipRefresh = false,
  } = options;

  const url = new URL(`${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let payload: BodyInit | undefined;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), { method, headers, body: payload });

  if (res.status === 401 && auth && !skipRefresh) {
    if (!refreshPromise) {
      refreshPromise = tryRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const ok = await refreshPromise;
    if (ok) {
      return apiRequest<T>(path, { ...options, skipRefresh: true });
    }
  }

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError("Sunucudan geçersiz yanıt alındı.", res.status);
  }

  if (!res.ok || !json.success) {
    throw new ApiError(
      json.message || "İstek başarısız oldu.",
      res.status,
      json.errors ?? null,
    );
  }

  return json.data;
}

/** Binary/PDF indirme (JWT). Content-Disposition dosya adını kullanır. */
export async function apiDownload(
  path: string,
  options: { auth?: boolean; fallbackFilename?: string; skipRefresh?: boolean } = {},
): Promise<void> {
  const { auth = true, fallbackFilename = "indirilen.pdf", skipRefresh = false } = options;

  const url = new URL(`${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`);
  const headers: Record<string, string> = {
    Accept: "application/pdf,application/octet-stream,*/*",
  };

  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), { method: "GET", headers });

  if (res.status === 401 && auth && !skipRefresh) {
    if (!refreshPromise) {
      refreshPromise = tryRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const ok = await refreshPromise;
    if (ok) {
      return apiDownload(path, { ...options, skipRefresh: true });
    }
  }

  const contentType = res.headers.get("Content-Type") ?? "";
  if (!res.ok) {
    let message = "Dosya indirilemedi.";
    if (contentType.includes("application/json")) {
      try {
        const json = (await res.json()) as ApiEnvelope<unknown>;
        if (json.message) message = json.message;
      } catch {
        /* ignore */
      }
    }
    throw new ApiError(message, res.status);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match =
    /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(
      disposition,
    );
  const rawName = decodeURIComponent(
    (match?.[1] || match?.[2] || match?.[3] || fallbackFilename).trim(),
  );
  const filename = rawName.replace(/^["']|["']$/g, "") || fallbackFilename;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
