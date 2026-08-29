export function buildCookieHeader(
  isSecureOrigin: boolean,
  name: string,
  value: string,
  opts: { maxAge?: number; path?: string } = {},
): string {
  const parts = [`${name}=${value}`, `Path=${opts.path || "/"}`, "HttpOnly", "SameSite=Lax"];
  if (isSecureOrigin) parts.push("Secure");
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join("; ");
}

export function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1]! : null;
}
