import { AUTH_STORAGE_KEYS } from "./config";
import { AuthUser } from "./types";

const isBrowser = () => typeof window !== "undefined";

function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 7) {
  if (!isBrowser()) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
}

function clearCookie(name: string) {
  if (!isBrowser()) return;
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export const tokenStorage = {
  getAccessToken(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
  },

  getRefreshToken(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
  },

  getUser(): AuthUser | null {
    if (!isBrowser()) return null;
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEYS.user);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  setSession(accessToken: string, refreshToken: string, user: AuthUser) {
    if (!isBrowser()) return;
    window.localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, accessToken);
    window.localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
    window.localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
    setCookie(AUTH_STORAGE_KEYS.accessToken, accessToken);
    setCookie(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
    setCookie(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
  },

  setTokens(accessToken: string, refreshToken: string) {
    if (!isBrowser()) return;
    window.localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, accessToken);
    window.localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
    setCookie(AUTH_STORAGE_KEYS.accessToken, accessToken);
    setCookie(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
  },

  clear() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    clearCookie(AUTH_STORAGE_KEYS.accessToken);
    clearCookie(AUTH_STORAGE_KEYS.refreshToken);
    clearCookie(AUTH_STORAGE_KEYS.user);
  }
};
