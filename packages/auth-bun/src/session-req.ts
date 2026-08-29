import { decodeMockCookie, parseCookieValue, type AppSession, type MockSession } from "@shuttlepub/auth-core";
import { sealCookie, setCookieHeader, SESSION_COOKIE_NAME, unsealCookie } from "./env-cookies.ts";

export function getCookieValue(req: Request, name: string): string | null {
  return parseCookieValue(req.headers.get("cookie"), name);
}

// --- Mock mode ---
export function getMockSession(req: Request): MockSession | null {
  const value = getCookieValue(req, SESSION_COOKIE_NAME);
  return value ? decodeMockCookie(value) : null;
}

// --- Real mode ---
export async function setRealSessionCookie(headers: Headers, session: AppSession): Promise<void> {
  const sealed = await sealCookie(session);
  headers.append("Set-Cookie", setCookieHeader(SESSION_COOKIE_NAME, sealed));
}

export async function getRealSession(req: Request): Promise<AppSession | null> {
  const value = getCookieValue(req, SESSION_COOKIE_NAME);
  if (!value) return null;
  return unsealCookie<AppSession>(value);
}
