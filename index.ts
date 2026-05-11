import { renderPage } from "./dist/server.js";

// ============================================================
// Configuration
// ============================================================

const USE_MOCK = process.env.USE_MOCK !== "false"; // default: mock mode
const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:3000";

// External service URLs (real mode only)
const KRATOS_PUBLIC_URL = process.env.KRATOS_PUBLIC_URL || "http://localhost:4433";
const HYDRA_PUBLIC_URL = process.env.HYDRA_PUBLIC_URL || "http://localhost:4444";
const EMUMET_API_URL = process.env.EMUMET_API_URL || "http://localhost:8080";

// Hydra OAuth2 client config
const HYDRA_CLIENT_ID = process.env.HYDRA_CLIENT_ID || "ratcap-bff";
const HYDRA_CLIENT_SECRET = process.env.HYDRA_CLIENT_SECRET || "dev-secret";
const HYDRA_REDIRECT_URI = process.env.HYDRA_REDIRECT_URI || `${APP_ORIGIN}/auth/callback`;
const HYDRA_SCOPES = process.env.HYDRA_SCOPES || "openid offline_access email";
const HYDRA_AUDIENCE = process.env.HYDRA_AUDIENCE || "account";

// Cookie config
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "ratcap_session";
const OAUTH_COOKIE_NAME = process.env.OAUTH_COOKIE_NAME || "ratcap_oauth";
const COOKIE_SECRET_BASE64 = process.env.COOKIE_SECRET_BASE64; // 32-byte key, base64-encoded

// Timing config
const OAUTH_STATE_TTL_SECONDS = Number(process.env.OAUTH_STATE_TTL_SECONDS) || 300; // 5 min
const SESSION_REFRESH_SKEW_SECONDS = Number(process.env.SESSION_REFRESH_SKEW_SECONDS) || 60; // 1 min

// Derived config
const IS_SECURE_ORIGIN = APP_ORIGIN.startsWith("https://");

// ============================================================
// AES-GCM Cookie Encryption (real mode)
// ============================================================

let _cookieKey: CryptoKey | null = null;

async function getCookieKey(): Promise<CryptoKey> {
  if (_cookieKey) return _cookieKey;
  if (!COOKIE_SECRET_BASE64) throw new Error("COOKIE_SECRET_BASE64 is required in real mode");
  const raw = Uint8Array.from(atob(COOKIE_SECRET_BASE64), c => c.charCodeAt(0));
  if (raw.length !== 32) throw new Error("COOKIE_SECRET_BASE64 must decode to exactly 32 bytes");
  _cookieKey = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  return _cookieKey;
}

/** Encrypt JSON-serializable data → base64url string (iv:ciphertext) */
async function sealCookie<T>(data: T): Promise<string> {
  const key = await getCookieKey();
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
async function unsealCookie<T>(value: string): Promise<T | null> {
  try {
    const key = await getCookieKey();
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

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - str.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

// ============================================================
// Cookie helpers (mock: base64 JSON, real: AES-GCM)
// ============================================================

type AppSession = {
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

type PendingOAuth = {
  v: 1;
  state: string;
  codeVerifier: string;
  returnTo: string;
  expiresAt: number; // Unix timestamp
};

// Mock session (simple base64 JSON — NOT encrypted)
type MockSession = { token: string; username: string };

function encodeMockCookie(data: MockSession): string {
  return btoa(JSON.stringify(data));
}
function decodeMockCookie(value: string): MockSession | null {
  try {
    const parsed = JSON.parse(atob(value));
    if (typeof parsed.token === "string" && typeof parsed.username === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

function getCookieValue(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1]! : null;
}

function setCookieHeader(name: string, value: string, opts: { maxAge?: number; path?: string } = {}): string {
  const parts = [`${name}=${value}`, `Path=${opts.path || "/"}`, "HttpOnly", "SameSite=Lax"];
  if (IS_SECURE_ORIGIN) parts.push("Secure");
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join("; ");
}

/** Validate return_to as a safe relative path (no open redirect) */
function safeReturnTo(input: string | null): string {
  const raw = input || "/";
  // Must start with "/" and must NOT start with "//" or "/\" (protocol-relative or backslash tricks)
  if (/^\/(?![/\\])/.test(raw)) return raw;
  return "/";
}

function clearCookieHeader(name: string): string {
  return setCookieHeader(name, "", { maxAge: 0 });
}

// --- Mock mode session helpers ---
function setMockSessionCookie(headers: Headers, data: MockSession): void {
  headers.append("Set-Cookie", setCookieHeader(SESSION_COOKIE_NAME, encodeMockCookie(data)));
}
function clearMockSessionCookie(headers: Headers): void {
  headers.append("Set-Cookie", clearCookieHeader(SESSION_COOKIE_NAME));
}
function getMockSession(req: Request): MockSession | null {
  const value = getCookieValue(req, SESSION_COOKIE_NAME);
  return value ? decodeMockCookie(value) : null;
}

// --- Real mode session helpers ---
async function setRealSessionCookie(headers: Headers, session: AppSession): Promise<void> {
  const sealed = await sealCookie(session);
  headers.append("Set-Cookie", setCookieHeader(SESSION_COOKIE_NAME, sealed));
}
async function getRealSession(req: Request): Promise<AppSession | null> {
  const value = getCookieValue(req, SESSION_COOKIE_NAME);
  if (!value) return null;
  return unsealCookie<AppSession>(value);
}
async function setOAuthCookie(headers: Headers, data: PendingOAuth): Promise<void> {
  const sealed = await sealCookie(data);
  headers.append("Set-Cookie", setCookieHeader(OAUTH_COOKIE_NAME, sealed, { maxAge: OAUTH_STATE_TTL_SECONDS }));
}
async function getOAuthState(req: Request): Promise<PendingOAuth | null> {
  const value = getCookieValue(req, OAUTH_COOKIE_NAME);
  if (!value) return null;
  return unsealCookie<PendingOAuth>(value);
}

// ============================================================
// CookieJar — for proxying multi-step Kratos flows
// ============================================================

class CookieJar {
  private jar = new Map<string, string>();
  private setCookieHeaders: string[] = [];

  /** Ingest Set-Cookie headers from an upstream response */
  ingest(response: Response): void {
    for (const setCookie of response.headers.getSetCookie()) {
      this.setCookieHeaders.push(setCookie);
      // Parse cookie name=value for jar
      const match = setCookie.match(/^([^=]+)=([^;]*)/);
      if (match) this.jar.set(match[1]!, match[2]!);
    }
  }

  /** Build Cookie header string from jar for upstream requests */
  toCookieHeader(): string {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  /** Add only Kratos-relevant browser cookies (filter out app cookies to avoid leaking secrets) */
  mergeBrowserCookies(req: Request): void {
    const browserCookies = req.headers.get("cookie");
    if (!browserCookies) return;
    for (const part of browserCookies.split(";")) {
      const [name, ...rest] = part.trim().split("=");
      if (name && !this.jar.has(name) && name.startsWith("ory_kratos")) {
        this.jar.set(name, rest.join("="));
      }
    }
  }

  /** Append only Kratos-related Set-Cookie headers to the downstream response (filter out non-Kratos cookies) */
  applyToResponse(headers: Headers): void {
    for (const sc of this.setCookieHeaders) {
      // Only forward cookies that start with ory_kratos
      const match = sc.match(/^([^=]+)=/);
      if (match && match[1]!.startsWith("ory_kratos")) {
        headers.append("Set-Cookie", sc);
      }
    }
  }
}

// ============================================================
// PKCE helpers
// ============================================================

function randomBase64Url(bytes: number): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function pkceChallenge(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(hash));
}

// ============================================================
// Token refresh
// ============================================================

async function refreshAccessToken(session: AppSession): Promise<AppSession | null> {
  if (!session.refreshToken) return null;
  try {
    const resp = await fetch(`${HYDRA_PUBLIC_URL}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(`${HYDRA_CLIENT_ID}:${HYDRA_CLIENT_SECRET}`),
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

function isSessionExpiringSoon(session: AppSession): boolean {
  return session.expiresAt - Math.floor(Date.now() / 1000) < SESSION_REFRESH_SKEW_SECONDS;
}

// ============================================================
// Static files
// ============================================================

const staticFiles: Record<string, { path: string; contentType: string }> = {
  "/app.js": { path: "dist/app.js", contentType: "application/javascript" },
  "/style.css": { path: "dist/style.css", contentType: "text/css" },
};

function serveStatic(pathname: string): Response | null {
  const entry = staticFiles[pathname];
  if (!entry) return null;
  return new Response(Bun.file(entry.path), {
    headers: { "Content-Type": entry.contentType },
  });
}

// ============================================================
// Mock data store
// ============================================================

interface MockAccount {
  id: string;
  name: string;
  is_bot: boolean;
  public_key: string;
  created_at: string;
  moderation: null;
}

interface MockProfile {
  account_id: string;
  nanoid: string;
  display_name: string | null;
  summary: string | null;
  icon_url: string | null;
  banner_url: string | null;
}

interface MockMetadata {
  account_id: string;
  nanoid: string;
  label: string;
  content: string;
}

let mockNextId = 100;
function nextId(): string {
  return String(mockNextId++);
}

const mockAccounts: MockAccount[] = [
  { id: "acc_01", name: "alice", is_bot: false, public_key: "ed25519:AAAA", created_at: "2025-01-15T09:00:00Z", moderation: null },
  { id: "acc_02", name: "bob", is_bot: false, public_key: "ed25519:BBBB", created_at: "2025-02-20T14:30:00Z", moderation: null },
  { id: "acc_03", name: "bot-news", is_bot: true, public_key: "ed25519:CCCC", created_at: "2025-03-10T00:00:00Z", moderation: null },
];

const mockProfiles: MockProfile[] = [
  { account_id: "acc_01", nanoid: "prof_01", display_name: "Alice Wonderland", summary: "Exploring the rabbit hole of federated social networks.", icon_url: "https://api.dicebear.com/9.x/thumbs/svg?seed=alice", banner_url: "https://picsum.photos/seed/alice/800/200" },
  { account_id: "acc_02", nanoid: "prof_02", display_name: "Bob Builder", summary: "Can we fix it? Yes we can!", icon_url: "https://api.dicebear.com/9.x/thumbs/svg?seed=bob", banner_url: null },
  { account_id: "acc_03", nanoid: "prof_03", display_name: "News Bot", summary: "Automated news aggregator.", icon_url: "https://api.dicebear.com/9.x/thumbs/svg?seed=bot", banner_url: null },
];

const mockMetadata: MockMetadata[] = [
  { account_id: "acc_01", nanoid: "meta_01", label: "Website", content: "https://alice.example.com" },
  { account_id: "acc_01", nanoid: "meta_02", label: "Pronouns", content: "she/her" },
  { account_id: "acc_02", nanoid: "meta_03", label: "GitHub", content: "https://github.com/bob" },
];

// ============================================================
// Mock Auth handlers (BFF /auth/* endpoints)
// ============================================================

const MOCK_PASSWORD = "password";

async function handleMockAuth(req: Request, pathname: string): Promise<Response | null> {
  const method = req.method;

  // POST /auth/login — mock Kratos login
  if (method === "POST" && pathname === "/auth/login") {
    const csrfReject = csrfCheck(req);
    if (csrfReject) return csrfReject;

    let data: { identifier: unknown; password: unknown };
    try {
      data = await req.json() as { identifier: unknown; password: unknown };
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (typeof data.identifier !== "string" || typeof data.password !== "string" || !data.identifier.trim() || !data.password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (data.password !== MOCK_PASSWORD) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const username = data.identifier.trim();
    const token = "mock-bearer-token-" + username;
    const headers = new Headers({ "Content-Type": "application/json" });
    setMockSessionCookie(headers, { token, username });
    return new Response(JSON.stringify({ authenticated: true, username }), { status: 200, headers });
  }

  // GET /auth/oauth/start — mock: no-op redirect to return_to (session cookie already set by /auth/login)
  if (method === "GET" && pathname === "/auth/oauth/start") {
    const url = new URL(req.url);
    return new Response(null, {
      status: 302,
      headers: { Location: safeReturnTo(url.searchParams.get("return_to")) },
    });
  }

  // GET /auth/session — check session cookie, return session info
  if (method === "GET" && pathname === "/auth/session") {
    const session = getMockSession(req);
    if (session) {
      return Response.json({ authenticated: true, username: session.username });
    }
    return Response.json({ authenticated: false }, { status: 401 });
  }

  // POST /auth/logout — clear session cookie
  if (method === "POST" && pathname === "/auth/logout") {
    const csrfReject = csrfCheck(req);
    if (csrfReject) return csrfReject;

    const headers = new Headers({ "Content-Type": "application/json" });
    clearMockSessionCookie(headers);
    return new Response(JSON.stringify({ loggedOut: true }), { status: 200, headers });
  }

  return null;
}

// ============================================================
// CSRF protection — Origin/Referer check for state-changing requests
// ============================================================

function csrfCheck(req: Request): Response | null {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const expected = new URL(APP_ORIGIN).origin;

  if (origin) {
    if (origin !== expected) {
      return Response.json({ error: "CSRF check failed: origin mismatch" }, { status: 403 });
    }
    return null; // Origin header present and matches
  }
  if (referer) {
    try {
      if (new URL(referer).origin !== expected) {
        return Response.json({ error: "CSRF check failed: referer mismatch" }, { status: 403 });
      }
      return null;
    } catch { /* malformed referer */ }
  }
  // No Origin or Referer — reject (strict)
  return Response.json({ error: "CSRF check failed: missing origin" }, { status: 403 });
}

// ============================================================
// Real Auth handlers (BFF /auth/* endpoints, Kratos + Hydra)
// ============================================================

async function handleRealAuth(req: Request, pathname: string): Promise<Response | null> {
  const method = req.method;

  // POST /auth/login — Kratos Browser Flow proxy (2-step)
  if (method === "POST" && pathname === "/auth/login") {
    const csrfReject = csrfCheck(req);
    if (csrfReject) return csrfReject;

    let data: { identifier: unknown; password: unknown };
    try {
      data = await req.json() as { identifier: unknown; password: unknown };
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (typeof data.identifier !== "string" || typeof data.password !== "string" || !data.identifier.trim() || !data.password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    const jar = new CookieJar();
    jar.mergeBrowserCookies(req);

    try {
      // Step 1: Create login flow (refresh=true allows re-auth when session already exists)
      const flowResp = await fetch(`${KRATOS_PUBLIC_URL}/self-service/login/browser?refresh=true`, {
        headers: { "Accept": "application/json", "Cookie": jar.toCookieHeader() },
        redirect: "manual",
      });
      jar.ingest(flowResp);

      if (!flowResp.ok) {
        console.error("Kratos flow creation failed:", flowResp.status, await flowResp.text());
        return Response.json({ error: "Authentication service unavailable" }, { status: 502 });
      }

      const flow = await flowResp.json() as {
        id: string;
        ui?: { nodes?: Array<{ attributes?: { name?: string; value?: string }; type?: string }> };
      };

      // Extract CSRF token from flow UI nodes
      const csrfNode = flow.ui?.nodes?.find(
        (n: { attributes?: { name?: string } }) => n.attributes?.name === "csrf_token"
      );
      const csrfToken = csrfNode?.attributes?.value || "";

      // Step 2: Submit credentials
      const submitResp = await fetch(`${KRATOS_PUBLIC_URL}/self-service/login?flow=${flow.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Cookie": jar.toCookieHeader(),
        },
        body: JSON.stringify({
          method: "password",
          identifier: data.identifier.trim(),
          password: data.password,
          csrf_token: csrfToken,
        }),
        redirect: "manual",
      });
      jar.ingest(submitResp);

      // Handle Kratos errors (400 = validation, 401 = bad creds)
      if (submitResp.status === 400 || submitResp.status === 401) {
        const errBody = await submitResp.json() as {
          ui?: { messages?: Array<{ text?: string }> };
          error?: { message?: string };
        };
        // Extract user-facing error message from Kratos UI messages
        const kratosMsg = errBody.ui?.messages?.[0]?.text
          || errBody.error?.message
          || "Invalid email or password";
        return Response.json({ error: kratosMsg }, { status: 401 });
      }

      if (!submitResp.ok && submitResp.status !== 200) {
        console.error("Kratos login submit failed:", submitResp.status, await submitResp.text());
        return Response.json({ error: "Authentication service error" }, { status: 502 });
      }

      // Login succeeded — Kratos has set ory_kratos_session cookie in the jar
      const sessionResp = await submitResp.json() as {
        session?: { identity?: { traits?: { email?: string }; id?: string } };
      };
      const email = sessionResp.session?.identity?.traits?.email || data.identifier.trim();

      // Forward Kratos Set-Cookie headers to browser (especially ory_kratos_session)
      const responseHeaders = new Headers({ "Content-Type": "application/json" });
      jar.applyToResponse(responseHeaders);

      return new Response(JSON.stringify({ authenticated: true, username: email }), {
        status: 200,
        headers: responseHeaders,
      });
    } catch (err) {
      console.error("Kratos login error:", err);
      return Response.json({ error: "Authentication service unavailable" }, { status: 502 });
    }
  }

  // GET /auth/oauth/start — PKCE + state → redirect to Hydra authorize
  if (method === "GET" && pathname === "/auth/oauth/start") {
    const url = new URL(req.url);
    const returnTo = safeReturnTo(url.searchParams.get("return_to"));

    const state = randomBase64Url(32);
    const codeVerifier = randomBase64Url(32);
    const codeChallenge = await pkceChallenge(codeVerifier);

    // Store PKCE state in encrypted cookie
    const pendingOAuth: PendingOAuth = {
      v: 1,
      state,
      codeVerifier,
      returnTo,
      expiresAt: Math.floor(Date.now() / 1000) + OAUTH_STATE_TTL_SECONDS,
    };

    const headers = new Headers();
    await setOAuthCookie(headers, pendingOAuth);

    // Build Hydra authorize URL
    const authorizeUrl = new URL(`${HYDRA_PUBLIC_URL}/oauth2/auth`);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", HYDRA_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", HYDRA_REDIRECT_URI);
    authorizeUrl.searchParams.set("scope", HYDRA_SCOPES);
    authorizeUrl.searchParams.set("audience", HYDRA_AUDIENCE);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    headers.set("Location", authorizeUrl.toString());
    return new Response(null, { status: 302, headers });
  }

  // GET /auth/callback — exchange code for tokens, issue session cookie
  if (method === "GET" && pathname === "/auth/callback") {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Hydra error redirect
    if (error) {
      console.error("OAuth2 error:", error, url.searchParams.get("error_description"));
      const headers = new Headers({ Location: `/login?error=${encodeURIComponent(error)}` });
      headers.append("Set-Cookie", clearCookieHeader(OAUTH_COOKIE_NAME));
      return new Response(null, { status: 302, headers });
    }

    if (!code || !state) {
      const headers = new Headers({ Location: "/login?error=missing_params" });
      headers.append("Set-Cookie", clearCookieHeader(OAUTH_COOKIE_NAME));
      return new Response(null, { status: 302, headers });
    }

    // Validate state from encrypted cookie
    const pendingOAuth = await getOAuthState(req);
    if (!pendingOAuth || pendingOAuth.state !== state) {
      const headers = new Headers({ Location: "/login?error=invalid_state" });
      headers.append("Set-Cookie", clearCookieHeader(OAUTH_COOKIE_NAME));
      return new Response(null, { status: 302, headers });
    }

    // Check TTL
    if (pendingOAuth.expiresAt < Math.floor(Date.now() / 1000)) {
      const headers = new Headers({ Location: "/login?error=state_expired" });
      headers.append("Set-Cookie", clearCookieHeader(OAUTH_COOKIE_NAME));
      return new Response(null, { status: 302, headers });
    }

    // Exchange code for tokens
    try {
      const tokenResp = await fetch(`${HYDRA_PUBLIC_URL}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + btoa(`${HYDRA_CLIENT_ID}:${HYDRA_CLIENT_SECRET}`),
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: HYDRA_REDIRECT_URI,
          code_verifier: pendingOAuth.codeVerifier,
        }),
      });

      if (!tokenResp.ok) {
        console.error("Token exchange failed:", tokenResp.status, await tokenResp.text());
        const errHeaders = new Headers({ Location: "/login?error=token_exchange_failed" });
        errHeaders.append("Set-Cookie", clearCookieHeader(OAUTH_COOKIE_NAME));
        return new Response(null, { status: 302, headers: errHeaders });
      }

      const tokens = await tokenResp.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        scope: string;
        token_type: string;
        id_token?: string;
      };

      // Decode id_token for user info (JWT payload, no verification needed — we just got it from Hydra)
      let email: string | undefined;
      let sub: string | undefined;
      if (tokens.id_token) {
        try {
          const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(tokens.id_token.split(".")[1]!))) as { sub?: string; email?: string };
          sub = payload.sub;
          email = payload.email;
        } catch { /* ignore malformed id_token */ }
      }

      const session: AppSession = {
        v: 1,
        sub,
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenType: "Bearer",
        scope: tokens.scope,
        expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      };

      console.log("OAuth callback: token exchange success, setting session cookie. sub:", sub, "email:", email, "expiresAt:", session.expiresAt);

      const headers = new Headers();
      await setRealSessionCookie(headers, session);
      // Clear OAuth state cookie
      headers.append("Set-Cookie", clearCookieHeader(OAUTH_COOKIE_NAME));
      headers.set("Location", pendingOAuth.returnTo);
      return new Response(null, { status: 302, headers });
    } catch (err) {
      console.error("Token exchange error:", err);
      const errHeaders = new Headers({ Location: "/login?error=token_exchange_error" });
      errHeaders.append("Set-Cookie", clearCookieHeader(OAUTH_COOKIE_NAME));
      return new Response(null, { status: 302, headers: errHeaders });
    }
  }

  // GET /auth/session — check session cookie, return session info (+ lazy refresh)
  if (method === "GET" && pathname === "/auth/session") {
    const session = await getRealSession(req);
    if (!session) {
      const rawCookie = getCookieValue(req, SESSION_COOKIE_NAME);
      console.log("GET /auth/session: no valid session. Raw cookie present:", !!rawCookie, rawCookie ? `(length: ${rawCookie.length})` : "");
      return Response.json({ authenticated: false }, { status: 401 });
    }

    // Lazy refresh if expiring soon
    if (isSessionExpiringSoon(session)) {
      const refreshed = await refreshAccessToken(session);
      if (refreshed) {
        const headers = new Headers({ "Content-Type": "application/json" });
        await setRealSessionCookie(headers, refreshed);
        return new Response(
          JSON.stringify({ authenticated: true, username: refreshed.email || refreshed.sub || "unknown" }),
          { status: 200, headers }
        );
      }
      // Refresh failed but token not yet expired — serve stale
      if (session.expiresAt > Math.floor(Date.now() / 1000)) {
        return Response.json({ authenticated: true, username: session.email || session.sub || "unknown" });
      }
      // Expired and no refresh — force re-login
      const headers = new Headers({ "Content-Type": "application/json" });
      headers.append("Set-Cookie", clearCookieHeader(SESSION_COOKIE_NAME));
      return new Response(JSON.stringify({ authenticated: false }), { status: 401, headers });
    }

    return Response.json({ authenticated: true, username: session.email || session.sub || "unknown" });
  }

  // POST /auth/logout — clear session cookie + best-effort Hydra token revoke
  if (method === "POST" && pathname === "/auth/logout") {
    const csrfReject = csrfCheck(req);
    if (csrfReject) return csrfReject;

    const session = await getRealSession(req);

    // Best-effort token revocation (access token + refresh token)
    if (session) {
      const revokeToken = async (token: string) => {
        await fetch(`${HYDRA_PUBLIC_URL}/oauth2/revoke`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + btoa(`${HYDRA_CLIENT_ID}:${HYDRA_CLIENT_SECRET}`),
          },
          body: new URLSearchParams({ token }),
        });
      };
      try {
        const revocations: Promise<void>[] = [];
        if (session.accessToken) revocations.push(revokeToken(session.accessToken));
        if (session.refreshToken) revocations.push(revokeToken(session.refreshToken));
        await Promise.allSettled(revocations);
      } catch { /* best effort */ }
    }

    // Best-effort Kratos logout — forward Set-Cookie to clear ory_kratos_session
    // Only forward ory_kratos_* cookies to Kratos (same allowlist as CookieJar)
    const kratosSetCookies: string[] = [];
    try {
      const browserCookies = req.headers.get("cookie") || "";
      const filteredCookies = browserCookies
        .split(";")
        .map(c => c.trim())
        .filter(c => c.startsWith("ory_kratos"))
        .join("; ");

      const kratosLogoutResp = await fetch(`${KRATOS_PUBLIC_URL}/self-service/logout/browser`, {
        headers: {
          "Accept": "application/json",
          "Cookie": filteredCookies,
        },
      });
      if (kratosLogoutResp.ok) {
        const logoutFlow = await kratosLogoutResp.json() as { logout_url?: string };
        if (logoutFlow.logout_url) {
          // Hit the logout URL server-side to destroy Kratos session
          const logoutResp = await fetch(logoutFlow.logout_url, { redirect: "manual" });
          // Collect Set-Cookie headers from Kratos logout (to clear ory_kratos_session on browser)
          for (const sc of logoutResp.headers.getSetCookie()) {
            const match = sc.match(/^([^=]+)=/);
            if (match && match[1]!.startsWith("ory_kratos")) {
              kratosSetCookies.push(sc);
            }
          }
        }
      }
    } catch { /* best effort */ }

    const headers = new Headers({ "Content-Type": "application/json" });
    headers.append("Set-Cookie", clearCookieHeader(SESSION_COOKIE_NAME));
    for (const sc of kratosSetCookies) {
      headers.append("Set-Cookie", sc);
    }
    return new Response(JSON.stringify({ loggedOut: true }), { status: 200, headers });
  }

  return null;
}

// ============================================================
// Mock API handlers
// ============================================================

async function handleMockApi(req: Request, pathname: string): Promise<Response> {
  // Enforce session authentication
  const session = getMockSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const method = req.method;

  // GET /api/accounts
  if (method === "GET" && pathname === "/api/accounts") {
    return Response.json({ items: mockAccounts, first: null, last: null });
  }

  // POST /api/accounts
  if (method === "POST" && pathname === "/api/accounts") {
    const data = await req.json() as { name: string; is_bot?: boolean };
    const id = "acc_" + nextId();
    const acc: MockAccount = {
      id,
      name: data.name,
      is_bot: data.is_bot ?? false,
      public_key: "ed25519:MOCK_" + id,
      created_at: new Date().toISOString(),
      moderation: null,
    };
    mockAccounts.push(acc);
    return Response.json(acc, { status: 201 });
  }

  // GET /api/accounts/:id
  const accountMatch = pathname.match(/^\/api\/accounts\/([^/]+)$/);
  if (method === "GET" && accountMatch) {
    const accId = accountMatch[1]!;
    const acc = mockAccounts.find(a => a.id === accId);
    return acc ? Response.json(acc) : Response.json({ error: "not found" }, { status: 404 });
  }

  // Profile routes: /api/accounts/:id/profile
  const profileMatch = pathname.match(/^\/api\/accounts\/([^/]+)\/profile$/);
  if (profileMatch) {
    const accountId = profileMatch[1]!;

    if (method === "GET") {
      const profile = mockProfiles.find(p => p.account_id === accountId);
      return profile ? Response.json(profile) : Response.json({ error: "not found" }, { status: 404 });
    }

    if (method === "POST") {
      const data = await req.json() as Record<string, unknown>;
      const existingIdx = mockProfiles.findIndex(p => p.account_id === accountId);
      const profile: MockProfile = {
        account_id: accountId,
        nanoid: existingIdx >= 0 ? mockProfiles[existingIdx]!.nanoid : "prof_" + nextId(),
        display_name: resolveTristateField(data, "display_name"),
        summary: resolveTristateField(data, "summary"),
        icon_url: resolveTristateField(data, "icon_url"),
        banner_url: resolveTristateField(data, "banner_url"),
      };
      if (existingIdx >= 0) {
        mockProfiles[existingIdx] = profile;
      } else {
        mockProfiles.push(profile);
      }
      return Response.json(profile, { status: 201 });
    }

    if (method === "PUT") {
      const data = await req.json() as Record<string, unknown>;
      const idx = mockProfiles.findIndex(p => p.account_id === accountId);
      if (idx < 0) return Response.json({ error: "not found" }, { status: 404 });
      const existing = mockProfiles[idx]!;
      mockProfiles[idx] = {
        account_id: existing.account_id,
        nanoid: existing.nanoid,
        display_name: resolveTristateUpdate(data, "display_name", existing.display_name),
        summary: resolveTristateUpdate(data, "summary", existing.summary),
        icon_url: resolveTristateUpdate(data, "icon_url", existing.icon_url),
        banner_url: resolveTristateUpdate(data, "banner_url", existing.banner_url),
      };
      return Response.json(mockProfiles[idx]);
    }
  }

  // GET /api/metadata?account_ids=...
  if (method === "GET" && pathname.startsWith("/api/metadata")) {
    const url = new URL(req.url);
    const accountIds = url.searchParams.get("account_ids")?.split(",") ?? [];
    const metas = mockMetadata.filter(m => accountIds.includes(m.account_id));
    return Response.json(metas);
  }

  // Metadata routes with nanoid: /api/accounts/:id/metadata/:nanoid
  const metadataWithIdMatch = pathname.match(/^\/api\/accounts\/([^/]+)\/metadata\/([^/]+)$/);
  if (metadataWithIdMatch) {
    const accountId = metadataWithIdMatch[1]!;
    const nanoid = metadataWithIdMatch[2]!;

    if (method === "PUT") {
      const data = await req.json() as { label: string; content: string };
      const idx = mockMetadata.findIndex(m => m.account_id === accountId && m.nanoid === nanoid);
      if (idx < 0) return Response.json({ error: "not found" }, { status: 404 });
      mockMetadata[idx] = { account_id: accountId, nanoid, label: data.label, content: data.content };
      return Response.json(mockMetadata[idx]);
    }

    if (method === "DELETE") {
      const idx = mockMetadata.findIndex(m => m.account_id === accountId && m.nanoid === nanoid);
      if (idx < 0) return Response.json({ error: "not found" }, { status: 404 });
      mockMetadata.splice(idx, 1);
      return new Response(null, { status: 204 });
    }
  }

  // POST /api/accounts/:id/metadata
  const metadataPostMatch = pathname.match(/^\/api\/accounts\/([^/]+)\/metadata$/);
  if (method === "POST" && metadataPostMatch) {
    const accountId = metadataPostMatch[1]!;
    const data = await req.json() as { label: string; content: string };
    const meta: MockMetadata = {
      account_id: accountId,
      nanoid: "meta_" + nextId(),
      label: data.label,
      content: data.content,
    };
    mockMetadata.push(meta);
    return Response.json(meta, { status: 201 });
  }

  return Response.json({ error: "not found" }, { status: 404 });
}

// Tristate JSON handling
function resolveTristateField(data: Record<string, unknown>, key: string): string | null {
  if (!(key in data)) return null;
  return data[key] as string | null;
}

function resolveTristateUpdate(data: Record<string, unknown>, key: string, existing: string | null): string | null {
  if (!(key in data)) return existing;
  return data[key] as string | null;
}

// ============================================================
// Real API proxy (with lazy token refresh)
// ============================================================

const PROXY_ALLOWED_HEADERS = [
  "content-type",
  "accept",
  "content-length",
];

async function proxyToEmumet(req: Request, pathname: string): Promise<Response> {
  const apiPath = pathname.replace(/^\/api/, "");
  const targetUrl = EMUMET_API_URL + apiPath + new URL(req.url).search;

  const headers = new Headers();
  for (const key of PROXY_ALLOWED_HEADERS) {
    const value = req.headers.get(key);
    if (value) headers.set(key, value);
  }

  // Read and optionally refresh session — reject unauthenticated requests
  let session = await getRealSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let updatedSessionHeaders: Headers | null = null;

  if (isSessionExpiringSoon(session)) {
    const refreshed = await refreshAccessToken(session);
    if (refreshed) {
      session = refreshed;
      updatedSessionHeaders = new Headers();
      await setRealSessionCookie(updatedSessionHeaders, refreshed);
    } else if (session.expiresAt <= Math.floor(Date.now() / 1000)) {
      // Fully expired, no refresh possible
      const h = new Headers({ "Content-Type": "application/json" });
      h.append("Set-Cookie", clearCookieHeader(SESSION_COOKIE_NAME));
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: h });
    }
  }

  // Inject Bearer token (NEVER forward browser's Authorization header)
  headers.set("Authorization", "Bearer " + session.accessToken);
  // DEBUG: Log JWT claims for troubleshooting
  try {
    const payload = session.accessToken.split(".")[1]!;
    const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0))));
    console.log("[DEBUG proxy] JWT claims:", JSON.stringify({ iss: claims.iss, sub: claims.sub, aud: claims.aud, exp: claims.exp, scp: claims.scp }));
    console.log("[DEBUG proxy] Target URL:", targetUrl);
  } catch (e) { console.log("[DEBUG proxy] JWT decode error:", e); }

  const proxyReq = new Request(targetUrl, {
    method: req.method,
    headers,
    body: req.body,
  });

  try {
    const response = await fetch(proxyReq);
    // Strip upstream Set-Cookie
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("set-cookie");
    // Append refreshed session cookie if applicable
    if (updatedSessionHeaders) {
      for (const sc of updatedSessionHeaders.getSetCookie()) {
        responseHeaders.append("Set-Cookie", sc);
      }
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("Proxy error:", err);
    return Response.json(
      { error: "Failed to reach upstream service" },
      { status: 502 }
    );
  }
}

// ============================================================
// SSR
// ============================================================

async function serveSSR(url: URL): Promise<Response> {
  const html = renderPage(url.pathname + url.search)();
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// ============================================================
// Server
// ============================================================

// ============================================================
// Startup validation
// ============================================================

if (!USE_MOCK) {
  // Validate required env vars for real mode
  const required: [string, string | undefined][] = [
    ["COOKIE_SECRET_BASE64", COOKIE_SECRET_BASE64],
  ];
  const missing = required.filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(`Real mode requires these environment variables: ${missing.join(", ")}`);
  }
  // Validate COOKIE_SECRET_BASE64 decodes to 32 bytes
  try {
    const raw = Uint8Array.from(atob(COOKIE_SECRET_BASE64!), c => c.charCodeAt(0));
    if (raw.length !== 32) throw new Error("not 32 bytes");
  } catch (err) {
    throw new Error(`COOKIE_SECRET_BASE64 must be a valid base64 string that decodes to exactly 32 bytes: ${err}`);
  }
}

Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);

    const staticResponse = serveStatic(url.pathname);
    if (staticResponse) return staticResponse;

    // Auth endpoints (BFF)
    if (url.pathname.startsWith("/auth/")) {
      const authHandler = USE_MOCK ? handleMockAuth : handleRealAuth;
      const authResponse = await authHandler(req, url.pathname);
      if (authResponse) return authResponse;
    }

    // API proxy
    if (url.pathname.startsWith("/api/")) {
      if (USE_MOCK) {
        return handleMockApi(req, url.pathname);
      } else {
        return proxyToEmumet(req, url.pathname);
      }
    }

    return serveSSR(url);
  },
});

console.log(`Server running at http://localhost:3000 (${USE_MOCK ? "MOCK" : "REAL: Kratos=" + KRATOS_PUBLIC_URL + " Hydra=" + HYDRA_PUBLIC_URL + " Emumet=" + EMUMET_API_URL})`);
