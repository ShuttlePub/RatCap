// ============================================================
// Session foundation (side-effect-free shared module)
// bff/ から index.ts への import は禁止 (循環依存 + Bun.serve 副作用)
// のため、env デフォルトは index.ts と同じ値をここで解決する。
// ============================================================
const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:3000";
const IS_SECURE_ORIGIN = APP_ORIGIN.startsWith("https://");
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "ratcap_session";
const COOKIE_SECRET_BASE64 = process.env.COOKIE_SECRET_BASE64; // 32-byte key, base64-encoded
const HYDRA_PUBLIC_URL = process.env.HYDRA_PUBLIC_URL || "http://localhost:4444";
const HYDRA_CLIENT_ID = process.env.HYDRA_CLIENT_ID || "ratcap-bff";
const HYDRA_CLIENT_SECRET = process.env.HYDRA_CLIENT_SECRET || "dev-secret";
const SESSION_REFRESH_SKEW_SECONDS = Number(process.env.SESSION_REFRESH_SKEW_SECONDS) || 60; // 1 min

// ============================================================
// Session types
// ============================================================

export type AppSession = {
  v: 1;
  sub?: string;
  email?: string;
  name?: string;
  accessToken: string;
  refreshToken?: string;
  tokenType: "Bearer";
  scope: string;
  expiresAt: number; // Unix timestamp
};

// Mock session (simple base64 JSON — NOT encrypted)
export type MockSession = { token: string; username: string };

export function encodeMockCookie(data: MockSession): string {
  return btoa(JSON.stringify(data));
}
export function decodeMockCookie(value: string): MockSession | null {
  try {
    const parsed = JSON.parse(atob(value));
    if (typeof parsed.token === "string" && typeof parsed.username === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// base64url helpers
// ============================================================

export function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - str.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

// ============================================================
// Cookie header helpers
// ============================================================

export function getCookieValue(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1]! : null;
}

function buildCookieHeader(isSecureOrigin: boolean, name: string, value: string, opts: { maxAge?: number; path?: string } = {}): string {
  const parts = [`${name}=${value}`, `Path=${opts.path || "/"}`, "HttpOnly", "SameSite=Lax"];
  if (isSecureOrigin) parts.push("Secure");
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join("; ");
}

export function setCookieHeader(name: string, value: string, opts: { maxAge?: number; path?: string } = {}): string {
  return buildCookieHeader(IS_SECURE_ORIGIN, name, value, opts);
}

export function clearCookieHeader(name: string): string {
  return setCookieHeader(name, "", { maxAge: 0 });
}

// ============================================================
// AES-GCM cookie encryption core (key-parametrized)
// ============================================================

async function importCookieKey(secretBase64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(secretBase64), c => c.charCodeAt(0));
  if (raw.length !== 32) throw new Error("COOKIE_SECRET_BASE64 must decode to exactly 32 bytes");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** Encrypt JSON-serializable data → base64url string (iv:ciphertext) */
async function sealWithKey<T>(key: CryptoKey, data: T): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  // Concatenate iv + ciphertext, encode as base64url
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv);
  combined.set(ciphertext, iv.length);
  const encoded = base64UrlEncode(combined);
  console.log("sealCookie: plaintext length:", plaintext.length, "combined length:", combined.length, "encoded length:", encoded.length);
  return encoded;
}

/** Decrypt base64url string → parsed JSON, or null on failure */
async function unsealWithKey<T>(key: CryptoKey, value: string): Promise<T | null> {
  try {
    const combined = base64UrlDecode(value);
    console.log("unsealCookie: input length:", value.length, "decoded length:", combined.length);
    if (combined.length < 13) return null; // 12-byte IV + at least 1 byte
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch (err) {
    console.error("unsealCookie failed:", err);
    return null;
  }
}

// --- Env-configured encryption (used by index.ts /auth/* handlers) ---

let _cookieKey: CryptoKey | null = null;

async function getCookieKey(): Promise<CryptoKey> {
  if (_cookieKey) return _cookieKey;
  if (!COOKIE_SECRET_BASE64) throw new Error("COOKIE_SECRET_BASE64 is required in real mode");
  _cookieKey = await importCookieKey(COOKIE_SECRET_BASE64);
  return _cookieKey;
}

export async function sealCookie<T>(data: T): Promise<string> {
  return sealWithKey(await getCookieKey(), data);
}

export async function unsealCookie<T>(value: string): Promise<T | null> {
  return unsealWithKey<T>(await getCookieKey(), value);
}

// ============================================================
// Session read/write helpers (env-configured)
// ============================================================

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

// ============================================================
// Token refresh (Hydra-parametrized core + env-configured wrapper)
// ============================================================

type HydraRefreshConfig = {
  publicUrl: string;
  clientId: string;
  clientSecret: string;
};

async function refreshWithHydra(hydra: HydraRefreshConfig, session: AppSession): Promise<AppSession | null> {
  if (!session.refreshToken) return null;
  try {
    const resp = await fetch(`${hydra.publicUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(`${hydra.clientId}:${hydra.clientSecret}`),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      token_type: string;
    };
    return {
      ...session,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || session.refreshToken,
      scope: data.scope,
      expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    };
  } catch {
    return null;
  }
}

export function refreshAccessToken(session: AppSession): Promise<AppSession | null> {
  return refreshWithHydra(
    { publicUrl: HYDRA_PUBLIC_URL, clientId: HYDRA_CLIENT_ID, clientSecret: HYDRA_CLIENT_SECRET },
    session,
  );
}

function isExpiringSoon(session: AppSession, skewSeconds: number): boolean {
  return session.expiresAt - Math.floor(Date.now() / 1000) < skewSeconds;
}

export function isSessionExpiringSoon(session: AppSession): boolean {
  return isExpiringSoon(session, SESSION_REFRESH_SKEW_SECONDS);
}

// ============================================================
// SessionAdapter — BFF GraphQL context 用のセッション解決インターフェース
// index.ts が USE_MOCK に応じていずれかを組み立てて注入する (DI)。
// ============================================================

/**
 * lazy refresh の結果 (index.ts proxyToEmumet / handleRealAuth /auth/session と同一の 3-way + no-op):
 * - fresh:                 refresh 不要 → 現 token を使用、Set-Cookie なし
 * - refreshed:             refresh 成功 → 新 token を使用、seal 済み cookie を送信
 * - refresh-failed-active: refresh 失敗かつ未期限切れ → 現 token をそのまま使用、Set-Cookie なし
 * - refresh-failed-expired: refresh 失敗かつ期限切れ → 未認証扱い、clear-cookie (Max-Age=0) を送信
 */
export type RefreshOutcome =
  | { kind: "fresh"; accessToken: string }
  | { kind: "refreshed"; accessToken: string; sessionCookieHeader: string }
  | { kind: "refresh-failed-active"; accessToken: string }
  | { kind: "refresh-failed-expired"; sessionCookieHeader: string };

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
      const value = getCookieValue(req, config.sessionCookieName);
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

/** Mock adapter が返すセッション: MockSession.token を accessToken として露出する */
export type MockAdapterSession = { accessToken: string; username: string };

/** Mock モード: base64 JSON の MockSession を解決する。期限はなく refresh は no-op */
export function createMockSessionAdapter(
  sessionCookieName: string = SESSION_COOKIE_NAME,
  isSecureOrigin: boolean = IS_SECURE_ORIGIN,
): SessionAdapter<MockAdapterSession> {
  const clearSessionCookie = (): string =>
    buildCookieHeader(isSecureOrigin, sessionCookieName, "", { maxAge: 0 });

  return {
    getSession(req) {
      const value = getCookieValue(req, sessionCookieName);
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
