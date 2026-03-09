import { renderPage, transformWeather } from "./dist/server.js";

// 7timer API - Tokyo (139.69E, 35.69N)
const WEATHER_API =
  "https://www.7timer.info/bin/civillight.php?lon=139.69&lat=35.69&ac=0&unit=metric&output=json";

const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let weatherCache: { data: string; fetchedAt: number } | null = null;

async function fetchWeatherWithCache(): Promise<string> {
  const now = Date.now();
  if (weatherCache && now - weatherCache.fetchedAt < WEATHER_CACHE_TTL_MS) {
    return weatherCache.data;
  }

  const upstream = await fetch(WEATHER_API);
  if (!upstream.ok) {
    throw new Error(`upstream returned ${upstream.status}`);
  }
  const rawJson = await upstream.text();
  const appJson = transformWeather(rawJson);

  weatherCache = { data: appJson, fetchedAt: now };
  return appJson;
}

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
    try {
      const appJson = await fetchWeatherWithCache();
      return new Response(appJson, {
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return Response.json({ error: "upstream unreachable" }, { status: 502 });
    }
  }

  return Response.json({ error: "not found" }, { status: 404 });
}

async function serveSSR(url: URL): Promise<Response> {
  let weatherJson = "";
  try {
    weatherJson = await fetchWeatherWithCache();
  } catch {
    // SSR proceeds without weather data
  }
  const html = renderPage(weatherJson)(url.pathname + url.search)();
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
