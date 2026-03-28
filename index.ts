import { renderPage } from "./dist/server.js";

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

async function serveApi(pathname: string): Promise<Response> {
  return Response.json({ error: "not found" }, { status: 404 });
}

async function serveSSR(url: URL): Promise<Response> {
  const html = renderPage(url.pathname + url.search)();
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);

    const staticResponse = serveStatic(url.pathname);
    if (staticResponse) return staticResponse;

    if (url.pathname.startsWith("/api/")) return serveApi(url.pathname);

    return serveSSR(url);
  },
});

console.log("Server running at http://localhost:3000");
