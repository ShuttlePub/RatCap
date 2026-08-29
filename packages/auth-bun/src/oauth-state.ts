import type { PendingOAuth } from "@shuttlepub/auth-core";
import { clearCookieHeader, OAUTH_COOKIE_NAME, OAUTH_STATE_TTL_SECONDS, sealCookie, setCookieHeader, unsealCookie } from "./env-cookies.ts";
import { getCookieValue } from "./session-req.ts";

export async function setOAuthCookie(headers: Headers, data: PendingOAuth): Promise<void> {
  const sealed = await sealCookie(data);
  headers.append("Set-Cookie", setCookieHeader(OAUTH_COOKIE_NAME, sealed, { maxAge: OAUTH_STATE_TTL_SECONDS }));
}

export async function getOAuthState(req: Request): Promise<PendingOAuth | null> {
  const value = getCookieValue(req, OAUTH_COOKIE_NAME);
  if (!value) return null;
  return unsealCookie<PendingOAuth>(value);
}
