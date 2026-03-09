import { renderPage, transformWeather } from "../dist/server.js";

const WEATHER_API =
  "https://www.7timer.info/bin/civillight.php?lon=139.69&lat=35.69&ac=0&unit=metric&output=json";

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
  if (pathname === "/api/weather") {
    const upstream = await fetch(WEATHER_API);
    const rawJson = await upstream.text();
    const appJson = transformWeather(rawJson);
    return Response.json(JSON.parse(appJson));
  }

  return Response.json({ error: "not found" }, { status: 404 });
}

function serveSSR(url: URL): Response {
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
