/** CookieJar — for proxying multi-step Kratos flows */
export class CookieJar {
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
