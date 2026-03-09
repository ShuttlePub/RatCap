import { renderPage } from "../dist/server.js";

Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/app.js")
      return new Response(Bun.file("dist/app.js"), {
        headers: { "Content-Type": "application/javascript" },
      });

    if (url.pathname === "/style.css")
      return new Response(Bun.file("dist/style.css"), {
        headers: { "Content-Type": "text/css" },
      });

    if (url.pathname.startsWith("/api/"))
      return new Response(JSON.stringify({ error: "not implemented" }), {
        status: 501,
        headers: { "Content-Type": "application/json" },
      });

    const html = renderPage(url.pathname + url.search)();
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

console.log("Server running at http://localhost:3000");
