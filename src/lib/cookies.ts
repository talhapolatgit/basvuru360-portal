const DEFAULT_MAX_AGE_SEC = 60 * 60 * 24 * 14; // 14 gün

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  for (const part of document.cookie.split("; ")) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return null;
}

export function setCookie(
  name: string,
  value: string,
  maxAgeSec: number = DEFAULT_MAX_AGE_SEC,
): void {
  if (typeof document === "undefined") return;
  document.cookie = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    "path=/",
    `max-age=${maxAgeSec}`,
    "SameSite=Lax",
  ].join("; ");
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Lax`;
}

export function readJsonCookie<T>(name: string): T | null {
  const raw = getCookie(name);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    deleteCookie(name);
    return null;
  }
}

export function writeJsonCookie<T>(
  name: string,
  value: T,
  maxAgeSec: number = DEFAULT_MAX_AGE_SEC,
): void {
  setCookie(name, JSON.stringify(value), maxAgeSec);
}
