import { renderPage } from "./dist/server.js";

// Configuration
const USE_MOCK = process.env.USE_MOCK !== "false"; // default: mock mode
const EMUMET_API_URL = process.env.EMUMET_API_URL || "http://localhost:8080";

// --- Static files ---
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

// --- Mock data store ---
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

// --- Mock API handlers ---
async function handleMockApi(req: Request, pathname: string): Promise<Response> {
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

// Tristate JSON handling: key present with value = set, key present with null = null, key absent = omit (keep existing)
function resolveTristateField(data: Record<string, unknown>, key: string): string | null {
  if (!(key in data)) return null; // absent on create → default to null
  return data[key] as string | null; // present: use as-is (string or null)
}

function resolveTristateUpdate(data: Record<string, unknown>, key: string, existing: string | null): string | null {
  if (!(key in data)) return existing; // omitted = keep
  return data[key] as string | null; // null = set null, string = set value
}

// --- Real API proxy ---
const PROXY_ALLOWED_HEADERS = [
  "content-type",
  "accept",
  "authorization",
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

  const proxyReq = new Request(targetUrl, {
    method: req.method,
    headers,
    body: req.body,
  });

  try {
    const response = await fetch(proxyReq);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (err) {
    return Response.json(
      { error: "proxy error", message: String(err) },
      { status: 502 }
    );
  }
}

// --- SSR ---
async function serveSSR(url: URL): Promise<Response> {
  const html = renderPage(url.pathname + url.search)();
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// --- Server ---
Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);

    const staticResponse = serveStatic(url.pathname);
    if (staticResponse) return staticResponse;

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

console.log(`Server running at http://localhost:3000 (${USE_MOCK ? "MOCK" : "API: " + EMUMET_API_URL})`);
