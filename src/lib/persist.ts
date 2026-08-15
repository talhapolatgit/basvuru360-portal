import { deleteCookie, readJsonCookie } from "./cookies";

export function readPersistedJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as T;
    }
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* yok say */
    }
  }

  const fromCookie = readJsonCookie<T>(key);
  if (fromCookie == null) return null;

  writePersistedJson(key, fromCookie);
  return fromCookie;
}

export function writePersistedJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* kota dolduysa sessizce geç */
  }
  deleteCookie(key);
}

export function deletePersistedJson(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* yok say */
  }
  deleteCookie(key);
}
