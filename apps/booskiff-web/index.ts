// ============================================================
// booskiff-web BFF + dev server — 配線のみ。ハンドラ本体は bff/
// (routes.ts / api.ts / auth-real.ts / jwks.ts)。
//
// import 順序の制約: "./bff/env.ts" を必ず最初に import する。
// @shuttlepub/auth-bun はモジュール定数 (cookie 名等) を import 時に
// process.env から読むため、静的 import の評価順に乗って env デフォルトを
// 先に確定させる (詳細は bff/env.ts のヘッダコメント)。
//
// SSR: dist/server.js (spago bundle 生成物) は動的 import し、存在しない
// fresh checkout では最小 HTML シェルを返す (spago bundle 前に
// `bun index.ts` が起動できるように)。静的 import にはしないこと。
// ============================================================

import "./bff/env.ts";
import { join } from "node:path";
import {
  createConsentHandler,
  createSessionAdapter,
  type AppSession,
  type SessionAdapter,
} from "@shuttlepub/auth-bun";
import { createBooskiffClient } from "./bff/booskiff/real.ts";
import { createTestSessionAdapter } from "./bff/session-test-adapter.ts";
import { handleApiRequest, handleAuthRequest, type ApiDeps, type AuthDeps } from "./bff/routes.ts";
import { buildJwksResponse } from "./bff/jwks.ts";

// ============================================================
// Configuration
// ============================================================

const PORT = Number(process.env.PORT) || 3000;
const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:3000";
const IS_SECURE_ORIGIN = APP_ORIGIN.startsWith("https://");
const CORE_API_URL = process.env.CORE_API_URL || "http://localhost:8080";
const USE_MOCK = process.env.USE_MOCK !== "false"; // default: mock mode
const USE_TEST_JWT = process.env.USE_TEST_JWT === "true";

// mock モードのテスト JWT (RS256)
const TEST_JWT_ISSUER = process.env.TEST_JWT_ISSUER || "http://localhost:3000";
const TEST_JWT_TTL_SECONDS = 3600;
const TEST_JWT_PRIVATE_KEY_PEM_BASE64 = process.env.TEST_JWT_PRIVATE_KEY_PEM_BASE64 ?? null;
const TEST_JWT_JWKS_JSON = process.env.TEST_JWT_JWKS_JSON ?? null;
const TEST_JWT_PUBLIC_KEY_PEM = process.env.TEST_JWT_PUBLIC_KEY_PEM ?? null; // PEM ファイルパス

// External service URLs (real mode only)
const KRATOS_PUBLIC_URL = process.env.KRATOS_PUBLIC_URL || "http://localhost:4433";
const HYDRA_PUBLIC_URL = process.env.HYDRA_PUBLIC_URL || "http://localhost:4444";
const CONSENT_API_URL = process.env.CONSENT_API_URL || process.env.EMUMET_API_URL || "http://localhost:8080";

// Hydra OAuth2 client config (real mode)
const HYDRA_CLIENT_ID = process.env.HYDRA_CLIENT_ID || "booskiff-bff";
const HYDRA_CLIENT_SECRET = process.env.HYDRA_CLIENT_SECRET || "dev-secret";
const HYDRA_REDIRECT_URI = `${APP_ORIGIN}/auth/callback`;
const HYDRA_SCOPES = process.env.HYDRA_SCOPES || "openid profile email offline_access";
const HYDRA_AUDIENCE = process.env.HYDRA_AUDIENCE || "account";

// Cookie config — bff/env.ts が mock モードのデフォルトを保証する
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "booskiff_session";
const OAUTH_COOKIE_NAME = process.env.OAUTH_COOKIE_NAME || "booskiff_oauth";
const COOKIE_SECRET_BASE64 = process.env.COOKIE_SECRET_BASE64 || "";

// Timing config
const SESSION_REFRESH_SKEW_SECONDS = Number(process.env.SESSION_REFRESH_SKEW_SECONDS) || 60;
const OAUTH_STATE_TTL_SECONDS = Number(process.env.OAUTH_STATE_TTL_SECONDS) || 300;

// ============================================================
// Startup validation
// ============================================================

if (!USE_MOCK) {
  if (!COOKIE_SECRET_BASE64) {
    throw new Error("Real mode requires COOKIE_SECRET_BASE64 (32-byte key, base64-encoded)");
  }
  try {
    const raw = Uint8Array.from(atob(COOKIE_SECRET_BASE64), (c) => c.charCodeAt(0));
    if (raw.length !== 32) throw new Error(`decoded length is ${raw.length}`);
  } catch (err) {
    throw new Error(`COOKIE_SECRET_BASE64 must be a valid base64 string that decodes to exactly 32 bytes: ${err}`);
  }
} else if (!TEST_JWT_PRIVATE_KEY_PEM_BASE64) {
  console.warn("USE_MOCK mode: TEST_JWT_PRIVATE_KEY_PEM_BASE64 is not set — mock login will fail until it is provided");
}

// ============================================================
// Session adapter / handlers wiring
// ============================================================

const adapterConfig = {
  cookieSecretBase64: COOKIE_SECRET_BASE64,
  sessionCookieName: SESSION_COOKIE_NAME,
  isSecureOrigin: IS_SECURE_ORIGIN,
  hydraPublicUrl: HYDRA_PUBLIC_URL,
  hydraClientId: HYDRA_CLIENT_ID,
  hydraClientSecret: HYDRA_CLIENT_SECRET,
  refreshSkewSeconds: SESSION_REFRESH_SKEW_SECONDS,
};

// SessionAdapter は USE_MOCK に応じて切替:
// mock: 実署名テスト JWT を accessToken に持つ AppSession (refreshToken 無し
//       → refresh を skip する test adapter)
// real: AES-GCM AppSession + Hydra refresh
const sessionAdapter: SessionAdapter<AppSession> = USE_MOCK
  ? createTestSessionAdapter(adapterConfig)
  : createSessionAdapter(adapterConfig);

const authDeps: AuthDeps = {
  adapter: sessionAdapter,
  mode: USE_MOCK
    ? {
        kind: "mock",
        testJwt: {
          privateKeyPemBase64: TEST_JWT_PRIVATE_KEY_PEM_BASE64 ?? "",
          issuer: TEST_JWT_ISSUER,
          ttlSeconds: TEST_JWT_TTL_SECONDS,
        },
      }
    : {
        kind: "real",
        kratosPublicUrl: KRATOS_PUBLIC_URL,
        hydraPublicUrl: HYDRA_PUBLIC_URL,
        hydraClientId: HYDRA_CLIENT_ID,
        hydraClientSecret: HYDRA_CLIENT_SECRET,
        hydraRedirectUri: HYDRA_REDIRECT_URI,
        hydraScopes: HYDRA_SCOPES,
        hydraAudience: HYDRA_AUDIENCE,
        oauthStateTtlSeconds: OAUTH_STATE_TTL_SECONDS,
      },
};

// data 呼出は mock モードでも常に CORE_API_URL へ流れる (USE_MOCK は auth のみ)
const apiDeps: ApiDeps = {
  adapter: sessionAdapter,
  createClient: (accessToken) => createBooskiffClient({ coreApiUrl: CORE_API_URL }, accessToken),
};

const consentHandler = createConsentHandler({ emumetApiUrl: CONSENT_API_URL, appOrigin: APP_ORIGIN });

// ============================================================
// Static files
// ============================================================

const staticFiles: Record<string, { path: string; contentType: string }> = {
  "/app.js": { path: "dist/app.js", contentType: "application/javascript" },
  "/style.css": { path: "dist/style.css", contentType: "text/css" },
  "/theme.js": { path: "node_modules/@shuttlepub/design-tokens/theme.js", contentType: "application/javascript" },
};

function serveStatic(pathname: string): Response | null {
  const entry = staticFiles[pathname];
  if (!entry) return null;
  return new Response(Bun.file(join(import.meta.dir, entry.path)), {
    headers: { "Content-Type": entry.contentType },
  });
}

// ============================================================
// SSR
// ============================================================

type SsrModule = {
  renderPage: (path: string) => () => string;
};

const SSR_SHELL_HTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Booskiff</title><link rel="stylesheet" href="/style.css"></head>
<body><main id="app"><p>Booskiff UI is not built yet. Run <code>spago bundle</code> (see scripts/dev.sh).</p></main><script type="module" src="/app.js"></script></body>
</html>`;

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8" };

async function serveSSR(url: URL): Promise<Response> {
  const serverPath = join(import.meta.dir, "dist", "server.js");
  if (await Bun.file(serverPath).exists()) {
    const mod: SsrModule = await import("./dist/server.js");
    const html: string = mod.renderPage(url.pathname + url.search)();
    return new Response(html, { headers: HTML_HEADERS });
  }
  return new Response(SSR_SHELL_HTML, { headers: HTML_HEADERS });
}

// ============================================================
// Server
// ============================================================

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    const staticResponse = serveStatic(url.pathname);
    if (staticResponse) return staticResponse;

    if (url.pathname === "/.well-known/jwks.json") {
      if (USE_MOCK || USE_TEST_JWT) {
        return buildJwksResponse({ jwksJson: TEST_JWT_JWKS_JSON, publicKeyPemPath: TEST_JWT_PUBLIC_KEY_PEM });
      }
      return new Response("not found", { status: 404 });
    }

    const apiResponse = await handleApiRequest(req, apiDeps);
    if (apiResponse) return apiResponse;

    const authResponse = await handleAuthRequest(req, authDeps);
    if (authResponse) return authResponse;

    if (!USE_MOCK && url.pathname === "/oauth2/consent") {
      return consentHandler(req);
    }

    return serveSSR(url);
  },
});

console.log(`Server running at http://localhost:${PORT} (${USE_MOCK ? "MOCK" : "REAL: Kratos=" + KRATOS_PUBLIC_URL + " Hydra=" + HYDRA_PUBLIC_URL + " Core=" + CORE_API_URL})`);
