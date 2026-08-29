// ============================================================
// (g-1) Real セッションアダプタ直接テスト — 固定鍵での seal/unseal
//       ラウンドトリップと refresh 4 分岐 (stub fetch 使用)
// ============================================================

import { afterEach, describe, expect, test } from "bun:test";
import {
  createSessionAdapter,
  type AppSession,
  type SessionAdapterConfig,
} from "./src/index.ts";
import { jsonResponse, stubFetch } from "./test-utils.ts";

// 固定鍵 (32 バイト "0..f" の base64) — テスト間で seal/unseal が往復できることだけが要件
const FIXED_KEY_BASE64 = btoa("0123456789abcdef0123456789abcdef");

const config: SessionAdapterConfig = {
  cookieSecretBase64: FIXED_KEY_BASE64,
  sessionCookieName: "ratcap_session",
  isSecureOrigin: false,
  hydraPublicUrl: "http://hydra.test",
  hydraClientId: "test-client",
  hydraClientSecret: "test-secret",
  refreshSkewSeconds: 60,
};

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function makeSession(overrides: Partial<AppSession> = {}): AppSession {
  return {
    v: 1,
    sub: "user-1",
    email: "alice@example.com",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    tokenType: "Bearer",
    scope: "openid offline_access",
    expiresAt: nowSeconds() + 3600,
    ...overrides,
  };
}

function cookieValueFromHeader(header: string): string {
  return header.split(";")[0].split("=")[1];
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  Object.assign(globalThis, { fetch: originalFetch });
});

describe("(g-1) createSessionAdapter — seal/unseal roundtrip", () => {
  test("sealSessionCookie → getSession roundtrips the session with a fixed key", async () => {
    // Given: 固定鍵のアダプタとセッション
    const adapter = createSessionAdapter(config);
    const session = makeSession();
    // When: seal して cookie ヘッダに載せて getSession
    const header = await adapter.sealSessionCookie(session);
    const req = new Request("http://localhost/graphql", {
      headers: { cookie: `ratcap_session=${cookieValueFromHeader(header)}` },
    });
    const restored = await adapter.getSession(req);
    // Then: 元セッションと一致、ヘッダは既存属性形式
    expect(restored).toEqual(session);
    expect(header).toMatch(/^ratcap_session=[A-Za-z0-9_-]+; Path=\/; HttpOnly; SameSite=Lax$/);
  });

  test("getSession returns null without cookie and with a tampered cookie", async () => {
    // Given
    const adapter = createSessionAdapter(config);
    // When / Then: cookie なし → null
    expect(await adapter.getSession(new Request("http://localhost/graphql"))).toBeNull();
    // And: 復号不能な値 → null (throw しない)
    const tampered = new Request("http://localhost/graphql", {
      headers: { cookie: "ratcap_session=not-a-valid-sealed-value" },
    });
    expect(await adapter.getSession(tampered)).toBeNull();
  });
});

describe("(g-1) refreshSessionIfNeeded 4 分岐", () => {
  test("fresh token: no fetch, kind fresh with current accessToken", async () => {
    // Given: 期限に余裕のあるセッション
    const adapter = createSessionAdapter(config);
    const { calls } = stubFetch(() => {
      throw new Error("fetch must not be called for a fresh session");
    });
    // When
    const outcome = await adapter.refreshSessionIfNeeded(makeSession());
    // Then: refresh せず現 token、fetch 0 回
    expect(outcome).toEqual({ kind: "fresh", accessToken: "access-1" });
    expect(calls).toHaveLength(0);
  });

  test("expiring token: refresh via stub fetch yields refreshed kind with sealed cookie", async () => {
    // Given: 期限間近のセッションと成功する Hydra stub
    const adapter = createSessionAdapter(config);
    const { calls } = stubFetch((call) => {
      expect(call.method).toBe("POST");
      expect(call.url).toBe("http://hydra.test/oauth2/token");
      return jsonResponse(200, {
        access_token: "access-2",
        refresh_token: "refresh-2",
        expires_in: 3600,
        scope: "openid offline_access",
        token_type: "Bearer",
      });
    });
    // When
    const outcome = await adapter.refreshSessionIfNeeded(makeSession({ expiresAt: nowSeconds() + 10 }));
    // Then: refreshed、新 token、seal 済み Set-Cookie 文字列
    expect(outcome.kind).toBe("refreshed");
    if (outcome.kind !== "refreshed") return;
    expect(outcome.accessToken).toBe("access-2");
    expect(outcome.sessionCookieHeader).toMatch(/^ratcap_session=[A-Za-z0-9_-]+; Path=\/; HttpOnly; SameSite=Lax$/);
    // And: Hydra への要求は refresh_token grant + Basic 認証
    expect(calls).toHaveLength(1);
    const body = new URLSearchParams(calls[0]?.body);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("refresh-1");
    expect(calls[0]?.headers.Authorization).toBe(`Basic ${btoa("test-client:test-secret")}`);
  });

  test("refresh failure with unexpired session: kind refresh-failed-active, current token kept", async () => {
    // Given: 期限間近だが未期限切れ + 失敗する Hydra stub
    const adapter = createSessionAdapter(config);
    stubFetch(() => new Response("invalid_grant", { status: 400 }));
    // When
    const outcome = await adapter.refreshSessionIfNeeded(makeSession({ expiresAt: nowSeconds() + 30 }));
    // Then: 現 token をそのまま使用
    expect(outcome).toEqual({ kind: "refresh-failed-active", accessToken: "access-1" });
  });

  test("refresh failure with expired session: kind refresh-failed-expired with clear-cookie", async () => {
    // Given: 期限切れ + 失敗する Hydra stub
    const adapter = createSessionAdapter(config);
    stubFetch(() => new Response("invalid_grant", { status: 400 }));
    // When
    const outcome = await adapter.refreshSessionIfNeeded(makeSession({ expiresAt: nowSeconds() - 10 }));
    // Then: clear-cookie (Max-Age=0)
    expect(outcome.kind).toBe("refresh-failed-expired");
    if (outcome.kind !== "refresh-failed-expired") return;
    expect(outcome.sessionCookieHeader).toBe("ratcap_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  });

  test("expiring session without refreshToken: refresh-failed-active (no fetch)", async () => {
    // Given: refreshToken 無し (refreshWithHydra は即 null)
    const adapter = createSessionAdapter(config);
    const { calls } = stubFetch(() => {
      throw new Error("fetch must not be called without a refresh token");
    });
    // When
    const session = makeSession({ expiresAt: nowSeconds() + 30 });
    delete session.refreshToken;
    const outcome = await adapter.refreshSessionIfNeeded(session);
    // Then
    expect(outcome).toEqual({ kind: "refresh-failed-active", accessToken: "access-1" });
    expect(calls).toHaveLength(0);
  });
});
