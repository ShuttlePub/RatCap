// ============================================================
// (g-1) yoga ハンドラ統合 (Real) — 暗号化セッション cookie を載せた
//       リクエストで refresh 4 シナリオの Set-Cookie / token 使用を検証
// (g-2) yoga ハンドラ統合 (Mock) — encodeMockCookie 形式の cookie で
//       認証済みクエリ成功 / cookie 無しで UNAUTHENTICATED
// ============================================================

import { afterEach, describe, expect, test } from "bun:test";
import { createYogaHandler } from "./server.ts";
import {
  createMockSessionAdapter,
  createSessionAdapter,
  encodeMockCookie,
  type AppSession,
  type SessionAdapterConfig,
} from "./session.ts";
import { createMockEmumetClient } from "./emumet/mock.ts";
import { jsonResponse, stubFetch } from "./test-utils.ts";

const FIXED_KEY_BASE64 = btoa("0123456789abcdef0123456789abcdef");

const realConfig: SessionAdapterConfig = {
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

type GqlBody = {
  data?: { accounts?: { items: { id: string; name: string }[] } | null } | null;
  errors?: { message: string; extensions?: { code?: string } }[];
};

const ACCOUNTS_QUERY = "{ accounts { items { id name } } }";

async function postGraphql(
  handler: (req: Request) => Promise<Response>,
  cookie?: string,
): Promise<{ status: number; setCookie: string | null; body: GqlBody }> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie !== undefined) headers.cookie = cookie;
  const res = await handler(
    new Request("http://localhost/graphql", {
      method: "POST",
      headers,
      body: JSON.stringify({ query: ACCOUNTS_QUERY }),
    }),
  );
  const body: GqlBody = await res.json();
  return { status: res.status, setCookie: res.headers.get("set-cookie"), body };
}

// Real 統合用: adapter + token を捕捉する EmumetClient ファクトリでハンドラを組み立てる
function makeRealHandler(captured: { token: string | null }) {
  const adapter = createSessionAdapter(realConfig);
  const emumet = createMockEmumetClient();
  const handler = createYogaHandler(adapter, (accessToken) => {
    captured.token = accessToken;
    return emumet;
  });
  return { adapter, handler };
}

async function sealedCookie(adapter: ReturnType<typeof createSessionAdapter>, session: AppSession): Promise<string> {
  const header = await adapter.sealSessionCookie(session);
  return `ratcap_session=${header.split(";")[0].split("=")[1]}`;
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  Object.assign(globalThis, { fetch: originalFetch });
});

describe("(g-1) yoga handler with encrypted session cookie (Real)", () => {
  test("refresh success → Set-Cookie with refreshed sealed session, new token used", async () => {
    // Given: 期限間近セッション + 成功する Hydra stub
    stubFetch(() =>
      jsonResponse(200, {
        access_token: "access-2",
        refresh_token: "refresh-2",
        expires_in: 3600,
        scope: "openid offline_access",
        token_type: "Bearer",
      }),
    );
    const captured: { token: string | null } = { token: null };
    const { adapter, handler } = makeRealHandler(captured);
    const cookie = await sealedCookie(adapter, makeSession({ expiresAt: nowSeconds() + 10 }));
    // When
    const { status, setCookie, body } = await postGraphql(handler, cookie);
    // Then: Set-Cookie 付与 (既存属性形式)、新 token で EmumetClient 生成、クエリ成功
    expect(status).toBe(200);
    expect(setCookie).toMatch(/^ratcap_session=[A-Za-z0-9_-]+; Path=\/; HttpOnly; SameSite=Lax$/);
    expect(captured.token).toBe("access-2");
    expect(body.errors).toBeUndefined();
    expect(body.data?.accounts?.items).toHaveLength(3);
  });

  test("no refresh needed → no Set-Cookie, current token used", async () => {
    // Given: 期限に余裕のあるセッション (fetch は呼ばれない)
    stubFetch(() => {
      throw new Error("fetch must not be called for a fresh session");
    });
    const captured: { token: string | null } = { token: null };
    const { adapter, handler } = makeRealHandler(captured);
    const cookie = await sealedCookie(adapter, makeSession());
    // When
    const { status, setCookie, body } = await postGraphql(handler, cookie);
    // Then
    expect(status).toBe(200);
    expect(setCookie).toBeNull();
    expect(captured.token).toBe("access-1");
    expect(body.data?.accounts?.items).toHaveLength(3);
  });

  test("refresh failed + not expired → no Set-Cookie, current token used", async () => {
    // Given: 期限間近だが未期限切れ + 失敗する Hydra stub
    stubFetch(() => new Response("invalid_grant", { status: 400 }));
    const captured: { token: string | null } = { token: null };
    const { adapter, handler } = makeRealHandler(captured);
    const cookie = await sealedCookie(adapter, makeSession({ expiresAt: nowSeconds() + 30 }));
    // When
    const { status, setCookie, body } = await postGraphql(handler, cookie);
    // Then: 現 token で継続、Set-Cookie なし
    expect(status).toBe(200);
    expect(setCookie).toBeNull();
    expect(captured.token).toBe("access-1");
    expect(body.data?.accounts?.items).toHaveLength(3);
  });

  test("refresh failed + expired → clear-cookie Set-Cookie AND UNAUTHENTICATED error", async () => {
    // Given: 期限切れ + 失敗する Hydra stub
    stubFetch(() => new Response("invalid_grant", { status: 400 }));
    const captured: { token: string | null } = { token: null };
    const { adapter, handler } = makeRealHandler(captured);
    const cookie = await sealedCookie(adapter, makeSession({ expiresAt: nowSeconds() - 10 }));
    // When
    const { status, setCookie, body } = await postGraphql(handler, cookie);
    // Then: Max-Age=0 の clear-cookie + UNAUTHENTICATED、EmumetClient は生成されない
    expect(status).toBe(200);
    expect(setCookie).toBe("ratcap_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    expect(captured.token).toBeNull();
    expect(body.data).toBeNull();
    expect(body.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
  });
});

describe("(g-2) yoga handler with mock session cookie (Mock)", () => {
  test("mock cookie (encodeMockCookie format) → authenticated accounts query succeeds", async () => {
    // Given: handleMockAuth と同形式の base64 mock cookie
    const adapter = createMockSessionAdapter();
    const emumet = createMockEmumetClient();
    const handler = createYogaHandler(adapter, () => emumet);
    const cookie = `ratcap_session=${encodeMockCookie({ token: "mock-token", username: "alice" })}`;
    // When
    const { status, setCookie, body } = await postGraphql(handler, cookie);
    // Then: MockEmumetClient のシードデータが返る (mock は refresh no-op → Set-Cookie なし)
    expect(status).toBe(200);
    expect(setCookie).toBeNull();
    expect(body.errors).toBeUndefined();
    expect(body.data?.accounts?.items.map((a) => a.name)).toEqual(["alice", "bob", "bot-news"]);
  });

  test("no cookie → UNAUTHENTICATED", async () => {
    // Given: cookie 無し
    const adapter = createMockSessionAdapter();
    const handler = createYogaHandler(adapter, () => createMockEmumetClient());
    // When
    const { status, setCookie, body } = await postGraphql(handler);
    // Then
    expect(status).toBe(200);
    expect(setCookie).toBeNull();
    expect(body.data).toBeNull();
    expect(body.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
  });
});
