import { isSameOrigin } from "@shuttlepub/auth-core";

const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:3000";

export function csrfCheck(req: Request): Response | null {
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
