// ============================================================
// /auth/* ハンドラ統合テスト (mock モード) — handleAuthRequest を
// Bun.serve 無しで直接呼ぶ。test-setup.ts が最初の import であること。
// - mock login: HttpOnly booskiff_session cookie + 実 RS256 署名 JWT
// - JWKS ラウンドトリップ: /.well-known/jwks.json の鍵で WebCrypto 検証
// - /auth/session, /auth/logout, CSRF, mock oauth start/callback
// ============================================================

import "./test-setup.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { base64UrlDecode, type AppSession, type SessionAdapterConfig } from "@shuttlepub/auth-bun";
import { handleAuthRequest, type AuthDeps } from "./routes.ts";
import { buildJwksResponse } from "./jwks.ts";
import { createTestSessionAdapter } from "./session-test-adapter.ts";
import { TEST_COOKIE_SECRET_BASE64, TEST_KEYS } from "./test-setup.ts";
import { stubFetch } from "./test-utils.ts";

const adapterConfig: SessionAdapterConfig = {
  cookieSecretBase64: TEST_COOKIE_SECRET_BASE64,
  sessionCookieName: "booskiff_session",
  isSecureOrigin: false,
  hydraPublicUrl: "http://hydra.test",
  hydraClientId: "test-client",
  hydraClientSecret: "test-secret",
  refreshSkewSeconds: 60,
};

const mockDeps: AuthDeps = {
  adapter: createTestSessionAdapter(adapterConfig),
  mode: {
    kind: "mock",
    testJwt: {
      privateKeyPemBase64: TEST_KEYS.privateKeyPemBase64,
      issuer: "http://localhost:3000",
      ttlSeconds: 3600,
    },
  },
};

async function auth(req: Request, deps: AuthDeps = mockDeps): Promise<Response> {
  const res = await handleAuthRequest(req, deps);
  if (!res) throw new Error(`no auth handler matched: ${req.method} ${new URL(req.url).pathname}`);
  return res;
}

function loginRequest(body: unknown, headers: Record<string, string> = { Origin: "http://localhost:3000" }): Request {
  return new Request("http://localhost:3000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function findSetCookie(res: Response, prefix: string): string {
  const found = res.headers.getSetCookie().find((c) => c.startsWith(prefix));
  if (!found) {
    throw new Error(`Set-Cookie "${prefix}…" not found in: ${JSON.stringify(res.headers.getSetCookie())}`);
  }
  return found;
}

async function loginCookie(username = "alice", password = "password"): Promise<string> {
  const res = await auth(loginRequest({ identifier: username, password }));
  return findSetCookie(res, "booskiff_session=").split(";")[0];
}

function decodeJwtSegment(segment: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(segment))) as Record<string, unknown>;
}

/** TS lib.dom の JsonWebKey には kid が無いためテスト側で拡張する */
type JwkWithMeta = JsonWebKey & { kid?: string };

const originalFetch = globalThis.fetch;
afterEach(() => {
  Object.assign(globalThis, { fetch: originalFetch });
});

describe("POST /auth/login (mock)", () => {
  test("success → 200 {authenticated,username} + HttpOnly SameSite=Lax booskiff_session cookie", async () => {
    stubFetch(() => {
      throw new Error("mock login must not call upstream");
    });
    const res = await auth(loginRequest({ identifier: "alice", password: "password" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ authenticated: true, username: "alice" });
    const setCookie = findSetCookie(res, "booskiff_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).not.toContain("Max-Age=0");
  });

  test("wrong password → 401", async () => {
    const res = await auth(loginRequest({ identifier: "alice", password: "wrong" }));
    expect(res.status).toBe(401);
  });

  test("origin mismatch → 403 (CSRF)", async () => {
    const res = await auth(loginRequest({ identifier: "alice", password: "password" }, { Origin: "http://evil.example" }));
    expect(res.status).toBe(403);
  });

  test("missing origin → 403 (CSRF strict)", async () => {
    const res = await auth(loginRequest({ identifier: "alice", password: "password" }, {}));
    expect(res.status).toBe(403);
  });
});

describe("mock session JWT ↔ /.well-known/jwks.json round-trip", () => {
  test("session accessToken verifies with WebCrypto against JWKS endpoint keys", async () => {
    const cookie = await loginCookie("alice");

    const jwksRes = await buildJwksResponse({ jwksJson: TEST_KEYS.jwksJson, publicKeyPemPath: null });
    expect(jwksRes.status).toBe(200);
    const jwks = await jwksRes.json() as { keys: JwkWithMeta[] };
    expect(jwks.keys).toHaveLength(1);
    const jwk = jwks.keys[0];
    expect(jwk.kid).toBe("test-key");
    expect(jwk.alg).toBe("RS256");
    expect(jwk.use).toBe("sig");
    expect(jwk.kty).toBe("RSA");

    const adapter = createTestSessionAdapter(adapterConfig);
    const session: AppSession | null = await adapter.getSession(
      new Request("http://localhost:3000/api/files", { headers: { cookie } }),
    );
    if (!session) throw new Error("session not resolved from mock login cookie");
    const jwt = session.accessToken;

    const [headerB64, payloadB64, signatureB64] = jwt.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) throw new Error(`malformed JWT: ${jwt}`);

    const header = decodeJwtSegment(headerB64);
    expect(header.alg).toBe("RS256");
    const payload = decodeJwtSegment(payloadB64);
    expect(payload.iss).toBe("http://localhost:3000");
    expect(payload.sub).toBe("alice");
    expect(payload.owner_type).toBe("account");
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      true,
      ["verify"],
    );
    const verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      Uint8Array.from(base64UrlDecode(signatureB64)),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`),
    );
    expect(verified).toBe(true);
  });

  test("jwks derives single RSA key from TEST_JWT_PUBLIC_KEY_PEM file when JWKS env unset", async () => {
    const dir = await mkdtemp(join(tmpdir(), "booskiff-jwks-"));
    try {
      const pemPath = join(dir, "public.pem");
      await writeFile(pemPath, TEST_KEYS.publicKeyPem, "utf8");
      const res = await buildJwksResponse({ jwksJson: null, publicKeyPemPath: pemPath });
      expect(res.status).toBe(200);
      const jwks = await res.json() as { keys: JwkWithMeta[] };
      const expected = JSON.parse(TEST_KEYS.jwksJson) as { keys: JwkWithMeta[] };
      expect(jwks.keys[0]?.n).toBe(expected.keys[0]?.n);
      expect(jwks.keys[0]?.e).toBe(expected.keys[0]?.e);
      expect(jwks.keys[0]?.kid).toBe("test-key");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("jwks → 404 when neither JWKS JSON nor public key path is available", async () => {
    const res = await buildJwksResponse({ jwksJson: null, publicKeyPemPath: null });
    expect(res.status).toBe(404);
  });
});

describe("GET /auth/session (mock)", () => {
  test("no cookie → 401 {authenticated:false}", async () => {
    const res = await auth(new Request("http://localhost:3000/auth/session"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ authenticated: false });
  });

  test("valid mock cookie → 200 {authenticated:true,username}", async () => {
    const cookie = await loginCookie("alice");
    const res = await auth(new Request("http://localhost:3000/auth/session", { headers: { cookie } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ authenticated: true, username: "alice" });
  });
});

describe("POST /auth/logout (mock)", () => {
  test("clears session cookie (Max-Age=0) and returns {loggedOut:true}", async () => {
    stubFetch(() => {
      throw new Error("mock logout must not call upstream");
    });
    const cookie = await loginCookie("alice");
    const res = await auth(new Request("http://localhost:3000/auth/logout", {
      method: "POST",
      headers: { Origin: "http://localhost:3000", cookie },
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ loggedOut: true });
    const setCookie = findSetCookie(res, "booskiff_session=");
    expect(setCookie).toContain("Max-Age=0");
  });

  test("missing origin → 403 (CSRF)", async () => {
    const res = await auth(new Request("http://localhost:3000/auth/logout", { method: "POST" }));
    expect(res.status).toBe(403);
  });
});

describe("mock oauth endpoints", () => {
  test("GET /auth/oauth/start → 302 to safe return_to", async () => {
    const res = await auth(new Request("http://localhost:3000/auth/oauth/start?return_to=%2Ffiles"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/files");
  });

  test("GET /auth/oauth/start with unsafe return_to → 302 to /", async () => {
    const res = await auth(new Request("http://localhost:3000/auth/oauth/start?return_to=http%3A%2F%2Fevil.example"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");
  });

  test("GET /auth/callback (mock) → 302 /login", async () => {
    const res = await auth(new Request("http://localhost:3000/auth/callback?code=x&state=y"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");
  });
});

describe("handleAuthRequest routing", () => {
  test("non-/auth path → null (not handled)", async () => {
    const res = await handleAuthRequest(new Request("http://localhost:3000/other"), mockDeps);
    expect(res).toBeNull();
  });

  test("unknown /auth path → null", async () => {
    const res = await handleAuthRequest(new Request("http://localhost:3000/auth/unknown"), mockDeps);
    expect(res).toBeNull();
  });
});
