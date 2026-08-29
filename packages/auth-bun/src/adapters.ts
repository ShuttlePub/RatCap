import {
  buildCookieHeader,
  decodeMockCookie,
  encodeMockCookie,
  importCookieKey,
  isExpiringSoon,
  parseCookieValue,
  sealWithKey,
  unsealWithKey,
  type AppSession,
  type MockAdapterSession,
  type RefreshOutcome,
} from "@shuttlepub/auth-core";
import { IS_SECURE_ORIGIN, SESSION_COOKIE_NAME, SESSION_REFRESH_SKEW_SECONDS } from "./env-cookies.ts";
import { refreshWithHydra } from "./refresh.ts";

export type { RefreshOutcome } from "@shuttlepub/auth-core";

export interface SessionAdapter<S extends { accessToken: string } = { accessToken: string }> {
  getSession(req: Request): Promise<S | null>;
  refreshSessionIfNeeded(session: S): Promise<RefreshOutcome>;
  /** session を seal した Set-Cookie ヘッダ文字列 (値全体) を返す */
  sealSessionCookie(session: S): Promise<string>;
  /** セッション cookie 削除用の Set-Cookie ヘッダ文字列 (Max-Age=0) を返す */
  clearSessionCookie(): string;
}

export type SessionAdapterConfig = {
  cookieSecretBase64: string;
  sessionCookieName: string;
  isSecureOrigin: boolean;
  hydraPublicUrl: string;
  hydraClientId: string;
  hydraClientSecret: string;
  refreshSkewSeconds: number;
};

/** Real モード: AES-GCM の AppSession を解決し、Hydra refresh に対応する */
export function createSessionAdapter(config: SessionAdapterConfig): SessionAdapter<AppSession> {
  let keyPromise: Promise<CryptoKey> | null = null;
  const getKey = (): Promise<CryptoKey> => {
    keyPromise ??= importCookieKey(config.cookieSecretBase64);
    return keyPromise;
  };

  const sealSessionCookie = async (session: AppSession): Promise<string> => {
    const sealed = await sealWithKey(await getKey(), session);
    return buildCookieHeader(config.isSecureOrigin, config.sessionCookieName, sealed);
  };
  const clearSessionCookie = (): string =>
    buildCookieHeader(config.isSecureOrigin, config.sessionCookieName, "", { maxAge: 0 });

  return {
    async getSession(req) {
      const value = parseCookieValue(req.headers.get("cookie"), config.sessionCookieName);
      if (!value) return null;
      return unsealWithKey<AppSession>(await getKey(), value);
    },
    async refreshSessionIfNeeded(session) {
      if (!isExpiringSoon(session, config.refreshSkewSeconds)) {
        return { kind: "fresh", accessToken: session.accessToken };
      }
      const refreshed = await refreshWithHydra(
        { publicUrl: config.hydraPublicUrl, clientId: config.hydraClientId, clientSecret: config.hydraClientSecret },
        session,
      );
      if (refreshed) {
        return {
          kind: "refreshed",
          accessToken: refreshed.accessToken,
          sessionCookieHeader: await sealSessionCookie(refreshed),
        };
      }
      if (session.expiresAt > Math.floor(Date.now() / 1000)) {
        return { kind: "refresh-failed-active", accessToken: session.accessToken };
      }
      return { kind: "refresh-failed-expired", sessionCookieHeader: clearSessionCookie() };
    },
    sealSessionCookie,
    clearSessionCookie,
  };
}

/** Mock モード: base64 JSON の MockSession を解決する。期限はなく refresh は no-op */
export function createMockSessionAdapter(
  sessionCookieName: string = SESSION_COOKIE_NAME,
  isSecureOrigin: boolean = IS_SECURE_ORIGIN,
): SessionAdapter<MockAdapterSession> {
  const clearSessionCookie = (): string =>
    buildCookieHeader(isSecureOrigin, sessionCookieName, "", { maxAge: 0 });

  return {
    getSession(req) {
      const value = parseCookieValue(req.headers.get("cookie"), sessionCookieName);
      const session = value ? decodeMockCookie(value) : null;
      return Promise.resolve(session ? { accessToken: session.token, username: session.username } : null);
    },
    refreshSessionIfNeeded(session) {
      // mock トークンに期限はない — refresh は no-op
      return Promise.resolve({ kind: "fresh", accessToken: session.accessToken });
    },
    sealSessionCookie(session) {
      // インターフェース完備のため提供 (mock では refresh しないため通常は使われない)
      const encoded = encodeMockCookie({ token: session.accessToken, username: session.username });
      return Promise.resolve(buildCookieHeader(isSecureOrigin, sessionCookieName, encoded));
    },
    clearSessionCookie,
  };
}
