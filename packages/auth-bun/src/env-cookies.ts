// ============================================================
// Session foundation env + cookie helpers
// apps/emumet-web/index.ts からの import は禁止 (循環依存 + Bun.serve 副作用)
// のため、env デフォルトは index.ts と同じ値をここで解決する。
// ============================================================
export const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:3000";
export const IS_SECURE_ORIGIN = APP_ORIGIN.startsWith("https://");
export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "ratcap_session";
export const OAUTH_COOKIE_NAME = process.env.OAUTH_COOKIE_NAME || "ratcap_oauth";
export const COOKIE_SECRET_BASE64 = process.env.COOKIE_SECRET_BASE64; // 32-byte key, base64-encoded
export const HYDRA_PUBLIC_URL = process.env.HYDRA_PUBLIC_URL || "http://localhost:4444";
export const HYDRA_CLIENT_ID = process.env.HYDRA_CLIENT_ID || "ratcap-bff";
export const HYDRA_CLIENT_SECRET = process.env.HYDRA_CLIENT_SECRET || "dev-secret";
export const SESSION_REFRESH_SKEW_SECONDS = Number(process.env.SESSION_REFRESH_SKEW_SECONDS) || 60; // 1 min
export const OAUTH_STATE_TTL_SECONDS = Number(process.env.OAUTH_STATE_TTL_SECONDS) || 300; // 5 min

import { buildCookieHeader, importCookieKey, sealWithKey, unsealWithKey } from "@shuttlepub/auth-core";

let _cookieKey: CryptoKey | null = null;

export async function getCookieKey(): Promise<CryptoKey> {
  if (_cookieKey) return _cookieKey;
  if (!COOKIE_SECRET_BASE64) throw new Error("COOKIE_SECRET_BASE64 is required in real mode");
  _cookieKey = await importCookieKey(COOKIE_SECRET_BASE64);
  return _cookieKey;
}

export function setCookieHeader(name: string, value: string, opts: { maxAge?: number; path?: string } = {}): string {
  return buildCookieHeader(IS_SECURE_ORIGIN, name, value, opts);
}

export function clearCookieHeader(name: string): string {
  return setCookieHeader(name, "", { maxAge: 0 });
}

export async function sealCookie<T>(data: T): Promise<string> {
  return sealWithKey(await getCookieKey(), data);
}

export async function unsealCookie<T>(value: string): Promise<T | null> {
  return unsealWithKey<T>(await getCookieKey(), value);
}
