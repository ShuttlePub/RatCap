import { afterEach, describe, expect, test } from "bun:test";
import { createConsentHandler } from "./src/index.ts";
import { jsonResponse, stubFetch } from "./test-utils.ts";

const config = {
  emumetApiUrl: "http://emumet.test",
  appOrigin: "http://ratcap.test",
} as const;

const originalFetch = globalThis.fetch;
afterEach(() => {
  Object.assign(globalThis, { fetch: originalFetch });
});

function expectHtmlHeaders(response: Response): void {
  expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(response.headers.get("set-cookie")).toBeNull();
}

function consentData(overrides: Readonly<Record<string, unknown>> = {}): Readonly<Record<string, unknown>> {
  return {
    action: "show_consent",
    consent_challenge: "challenge-1",
    client_name: "My App",
    requested_scope: ["openid", "offline_access", "email"],
    ...overrides,
  };
}

describe("OAuth2 consent GET", () => {
  test("returns a localized 400 without an upstream call when challenge is missing", async () => {
    // Given
    const { calls } = stubFetch(() => jsonResponse(200, consentData()));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(new Request("http://localhost/oauth2/consent", {
      headers: { "Accept-Language": "en-US" },
    }));

    // Then
    expect(response.status).toBe(400);
    expectHtmlHeaders(response);
    expect(await response.text()).toContain('<html lang="en">');
    expect(calls).toHaveLength(0);
  });

  test("renders the complete Japanese consent form by default", async () => {
    // Given
    const { calls } = stubFetch(() => jsonResponse(200, consentData()));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(new Request("http://localhost/oauth2/consent?consent_challenge=challenge-1"));
    const html = await response.text();

    // Then
    expect(response.status).toBe(200);
    expectHtmlHeaders(response);
    expect(html).toContain('<html lang="ja">');
    expect(html).toMatch(/<h1>[^<]+<\/h1>/);
    expect(html).toContain("My App");
    expect(html).toContain("基本プロフィール");
    expect(html).toContain("オフラインアクセス");
    expect(html).toContain("メールアドレス");
    expect(html).toContain('<form method="post" action="/oauth2/consent">');
    expect(html).toContain('type="hidden" name="consent_challenge" value="challenge-1"');
    expect(html).toContain('type="checkbox" name="grant_scope" value="openid" checked');
    expect(html).toContain('for="scope-0"');
    expect(html).toContain('name="decision" value="allow"');
    expect(html).toContain('name="decision" value="deny"');
    expect(html).toContain('<link rel="stylesheet" href="/style.css">');
    expect(html).toContain("<style>");
    expect(calls).toEqual([{
      url: "http://emumet.test/oauth2/consent?consent_challenge=challenge-1",
      method: "GET",
      headers: {},
      body: undefined,
    }]);
  });

  test("selects English from a regional preference list", async () => {
    // Given
    stubFetch(() => jsonResponse(200, consentData()));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(new Request("http://localhost/oauth2/consent?consent_challenge=challenge-1", {
      headers: { "Accept-Language": "en-US,en;q=0.9,ja;q=0.5" },
    }));
    const html = await response.text();

    // Then
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Basic profile");
    expect(html).toContain("Offline access");
    expect(html).toContain("Email address");
  });

  test("honors q-values over header order", async () => {
    // Given
    stubFetch(() => jsonResponse(200, consentData()));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(new Request("http://localhost/oauth2/consent?consent_challenge=challenge-1", {
      headers: { "Accept-Language": "en;q=0.4,ja;q=0.9" },
    }));

    // Then
    expect(await response.text()).toContain('<html lang="ja">');
  });

  test("falls back to Japanese for unsupported languages", async () => {
    // Given
    stubFetch(() => jsonResponse(200, consentData()));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(new Request("http://localhost/oauth2/consent?consent_challenge=challenge-1", {
      headers: { "Accept-Language": "fr-FR,zh;q=0.8,en;q=0" },
    }));

    // Then
    expect(await response.text()).toContain('<html lang="ja">');
  });

  test("renders an unknown scope by its raw name", async () => {
    // Given
    stubFetch(() => jsonResponse(200, consentData({ requested_scope: ["custom:write"] })));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(new Request("http://localhost/oauth2/consent?consent_challenge=challenge-1"));

    // Then
    expect(await response.text()).toContain("custom:write");
  });

  test("uses the localized generic application name when client_name is null", async () => {
    // Given
    stubFetch(() => jsonResponse(200, consentData({ client_name: null })));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(new Request("http://localhost/oauth2/consent?consent_challenge=challenge-1"));
    const html = await response.text();

    // Then
    expect(html).toContain("このアプリケーション");
    expect(html).not.toContain(">null<");
  });

  test("escapes client name, challenge, and unknown scope in HTML", async () => {
    // Given
    const challenge = 'challenge<&"\'>';
    const clientName = '<script>"client" & app</script>';
    const scope = '<img src=x onerror="alert(1)">';
    const query = new URLSearchParams({ consent_challenge: challenge });
    stubFetch(() => jsonResponse(200, consentData({
      consent_challenge: challenge,
      client_name: clientName,
      requested_scope: [scope],
    })));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(new Request(`http://localhost/oauth2/consent?${query}`));
    const html = await response.text();

    // Then
    expect(html).toContain(Bun.escapeHTML(clientName));
    expect(html).toContain(`value="${Bun.escapeHTML(challenge)}"`);
    expect(html).toContain(Bun.escapeHTML(scope));
    expect(html).not.toContain(clientName);
    expect(html).not.toContain(scope);
  });

  test("propagates an upstream redirect verbatim using manual redirect mode", async () => {
    // Given
    let redirect: RequestRedirect | undefined;
    Object.assign(globalThis, {
      fetch: (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        redirect = init?.redirect;
        return Promise.resolve(new Response(null, {
          status: 302,
          headers: { Location: "http://hydra.test/oauth2/auth/next?x=1&y=2" },
        }));
      },
    });
    const handler = createConsentHandler(config);

    // When
    const response = await handler(new Request("http://localhost/oauth2/consent?consent_challenge=challenge-1"));

    // Then
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://hydra.test/oauth2/auth/next?x=1&y=2");
    expect(response.headers.get("content-type")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.text()).toBe("");
    expect(redirect).toBe("manual");
  });

  test("renders a localized 502 page for an upstream 502", async () => {
    // Given
    stubFetch(() => new Response("upstream details", { status: 502 }));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(new Request("http://localhost/oauth2/consent?consent_challenge=challenge-1", {
      headers: { "Accept-Language": "en" },
    }));
    const html = await response.text();

    // Then
    expect(response.status).toBe(502);
    expectHtmlHeaders(response);
    expect(html).toContain('<html lang="en">');
    expect(html).not.toContain("upstream details");
  });

  test("renders 502 when upstream JSON is malformed", async () => {
    // Given
    stubFetch(() => new Response("{", { status: 200, headers: { "Content-Type": "application/json" } }));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(new Request("http://localhost/oauth2/consent?consent_challenge=challenge-1"));

    // Then
    expect(response.status).toBe(502);
    expectHtmlHeaders(response);
  });

  test("renders 502 when the upstream JSON shape is invalid", async () => {
    // Given
    stubFetch(() => jsonResponse(200, consentData({ requested_scope: ["openid", 42] })));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(new Request("http://localhost/oauth2/consent?consent_challenge=challenge-1"));

    // Then
    expect(response.status).toBe(502);
    expectHtmlHeaders(response);
  });

  test("renders 502 without exposing network errors", async () => {
    // Given
    stubFetch(() => {
      throw new TypeError("private network failure");
    });
    const handler = createConsentHandler(config);

    // When
    const response = await handler(new Request("http://localhost/oauth2/consent?consent_challenge=challenge-1"));
    const html = await response.text();

    // Then
    expect(response.status).toBe(502);
    expectHtmlHeaders(response);
    expect(html).not.toContain("private network failure");
  });

  test("renders 502 when an upstream redirect omits Location", async () => {
    // Given
    stubFetch(() => new Response(null, { status: 302 }));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(new Request("http://localhost/oauth2/consent?consent_challenge=challenge-1"));

    // Then
    expect(response.status).toBe(502);
    expectHtmlHeaders(response);
  });

  for (const method of ["PUT", "DELETE"] as const) {
    test(`returns 405 with Allow for ${method}`, async () => {
      // Given
      const { calls } = stubFetch(() => jsonResponse(200, consentData()));
      const handler = createConsentHandler(config);

      // When
      const response = await handler(new Request("http://localhost/oauth2/consent", { method }));

      // Then
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("GET, POST");
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(calls).toHaveLength(0);
    });
  }
});

function postRequest(body: URLSearchParams, headers: Readonly<Record<string, string>> = {}): Request {
  const requestHeaders = new Headers({
    "Content-Type": "application/x-www-form-urlencoded",
    Origin: "http://ratcap.test",
  });
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === "origin" && value === "") requestHeaders.delete("Origin");
    else requestHeaders.set(name, value);
  }
  return new Request("http://localhost/oauth2/consent", {
    method: "POST",
    headers: requestHeaders,
    body,
  });
}

describe("OAuth2 consent POST", () => {
  test("relays an allow decision with the exact selected scopes and no cookie", async () => {
    // Given
    const { calls } = stubFetch(() => new Response(null, {
      status: 302,
      headers: { Location: "http://hydra.test/oauth2/auth/allow" },
    }));
    const handler = createConsentHandler(config);
    const body = new URLSearchParams({ consent_challenge: "challenge-1", decision: "allow" });
    body.append("grant_scope", "openid");
    body.append("grant_scope", "email");

    // When
    const response = await handler(postRequest(body));

    // Then
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://hydra.test/oauth2/auth/allow");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(calls).toEqual([{
      url: "http://emumet.test/oauth2/consent",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent_challenge: "challenge-1", accept: true, grant_scope: ["openid", "email"] }),
    }]);
  });

  test("omits grant_scope from a deny decision even when scope fields are present", async () => {
    // Given
    const { calls } = stubFetch(() => new Response(null, {
      status: 302,
      headers: { Location: "http://hydra.test/oauth2/auth/deny" },
    }));
    const handler = createConsentHandler(config);
    const body = new URLSearchParams({
      consent_challenge: "challenge-1",
      decision: "deny",
      grant_scope: "openid",
    });

    // When
    const response = await handler(postRequest(body));

    // Then
    expect(response.status).toBe(302);
    const upstreamBody: unknown = JSON.parse(calls[0]?.body ?? "null");
    expect(upstreamBody).toEqual({ consent_challenge: "challenge-1", accept: false });
    expect(upstreamBody).not.toHaveProperty("grant_scope");
  });

  test("sends JSON and uses manual redirect mode", async () => {
    // Given
    const captured: { redirect: RequestRedirect | undefined; contentType: string | null } = {
      redirect: undefined,
      contentType: null,
    };
    Object.assign(globalThis, {
      fetch: (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        captured.redirect = init?.redirect;
        captured.contentType = new Headers(init?.headers).get("content-type");
        return Promise.resolve(new Response(null, {
          status: 302,
          headers: { Location: "http://hydra.test/next" },
        }));
      },
    });
    const handler = createConsentHandler(config);

    // When
    await handler(postRequest(new URLSearchParams({ consent_challenge: "challenge-1", decision: "deny" })));

    // Then
    expect(captured.redirect).toBe("manual");
    expect(captured.contentType).toBe("application/json");
  });

  test("accepts an exact matching Origin without a Cookie header", async () => {
    // Given
    const { calls } = stubFetch(() => new Response(null, {
      status: 302,
      headers: { Location: "http://hydra.test/next" },
    }));
    const handler = createConsentHandler(config);
    const request = postRequest(new URLSearchParams({ consent_challenge: "challenge-1", decision: "deny" }));

    // When
    const response = await handler(request);

    // Then
    expect(request.headers.get("cookie")).toBeNull();
    expect(response.status).toBe(302);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(calls).toHaveLength(1);
  });

  test("accepts a same-origin Referer when Origin is absent", async () => {
    // Given
    const { calls } = stubFetch(() => new Response(null, {
      status: 302,
      headers: { Location: "http://hydra.test/next" },
    }));
    const handler = createConsentHandler(config);
    const request = postRequest(
      new URLSearchParams({ consent_challenge: "challenge-1", decision: "deny" }),
      { Origin: "", Referer: "http://ratcap.test/oauth2/consent?source=hydra" },
    );

    // When
    const response = await handler(request);

    // Then
    expect(response.status).toBe(302);
    expect(calls).toHaveLength(1);
  });

  test("rejects a cross-origin Origin before calling upstream", async () => {
    // Given
    const { calls } = stubFetch(() => new Response(null, { status: 302 }));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(postRequest(
      new URLSearchParams({ consent_challenge: "challenge-1", decision: "deny" }),
      { Origin: "https://evil.test", Referer: "http://ratcap.test/oauth2/consent" },
    ));

    // Then
    expect(response.status).toBe(403);
    expectHtmlHeaders(response);
    expect(calls).toHaveLength(0);
  });

  test("rejects a request with both Origin and Referer absent", async () => {
    // Given
    const { calls } = stubFetch(() => new Response(null, { status: 302 }));
    const handler = createConsentHandler(config);
    const request = postRequest(
      new URLSearchParams({ consent_challenge: "challenge-1", decision: "deny" }),
      { Origin: "" },
    );

    // When
    const response = await handler(request);

    // Then
    expect(response.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  for (const headers of [
    { Origin: "not a url", Referer: "http://ratcap.test/oauth2/consent" },
    { Origin: "", Referer: "not a url" },
  ]) {
    test("rejects malformed CSRF source headers", async () => {
      // Given
      const { calls } = stubFetch(() => new Response(null, { status: 302 }));
      const handler = createConsentHandler(config);

      // When
      const response = await handler(postRequest(
        new URLSearchParams({ consent_challenge: "challenge-1", decision: "deny" }),
        headers,
      ));

      // Then
      expect(response.status).toBe(403);
      expect(calls).toHaveLength(0);
    });
  }

  test("rejects the same host on a different port", async () => {
    // Given
    const { calls } = stubFetch(() => new Response(null, { status: 302 }));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(postRequest(
      new URLSearchParams({ consent_challenge: "challenge-1", decision: "deny" }),
      { Origin: "http://ratcap.test:3000" },
    ));

    // Then
    expect(response.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  for (const body of [
    new URLSearchParams({ decision: "allow", grant_scope: "openid" }),
    new URLSearchParams({ consent_challenge: "challenge-1" }),
    new URLSearchParams({ consent_challenge: "challenge-1", decision: "later" }),
  ]) {
    test("returns 400 without an upstream call for invalid form fields", async () => {
      // Given
      const { calls } = stubFetch(() => new Response(null, { status: 302 }));
      const handler = createConsentHandler(config);

      // When
      const response = await handler(postRequest(body));

      // Then
      expect(response.status).toBe(400);
      expectHtmlHeaders(response);
      expect(calls).toHaveLength(0);
    });
  }

  test("returns 400 without an upstream call for malformed form data", async () => {
    // Given
    const { calls } = stubFetch(() => new Response(null, { status: 302 }));
    const handler = createConsentHandler(config);
    const request = new Request("http://localhost/oauth2/consent", {
      method: "POST",
      headers: { Origin: "http://ratcap.test", "Content-Type": "multipart/form-data" },
      body: "malformed",
    });

    // When
    const response = await handler(request);

    // Then
    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  test("maps an upstream 400 to a localized 400 page", async () => {
    // Given
    stubFetch(() => new Response("invalid scope details", { status: 400 }));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(postRequest(
      new URLSearchParams({ consent_challenge: "challenge-1", decision: "allow", grant_scope: "invalid" }),
      { "Accept-Language": "en-US" },
    ));
    const html = await response.text();

    // Then
    expect(response.status).toBe(400);
    expectHtmlHeaders(response);
    expect(html).toContain('<html lang="en">');
    expect(html).not.toContain("invalid scope details");
  });

  test("maps an upstream 502 to a localized 502 page", async () => {
    // Given
    stubFetch(() => new Response("hydra details", { status: 502 }));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(postRequest(
      new URLSearchParams({ consent_challenge: "challenge-1", decision: "deny" }),
      { "Accept-Language": "en;q=0.4,ja;q=0.9" },
    ));
    const html = await response.text();

    // Then
    expect(response.status).toBe(502);
    expectHtmlHeaders(response);
    expect(html).toContain('<html lang="ja">');
    expect(html).not.toContain("hydra details");
  });

  test("maps network failures to a localized 502 page", async () => {
    // Given
    stubFetch(() => {
      throw new TypeError("private relay failure");
    });
    const handler = createConsentHandler(config);

    // When
    const response = await handler(postRequest(
      new URLSearchParams({ consent_challenge: "challenge-1", decision: "deny" }),
      { "Accept-Language": "en" },
    ));
    const html = await response.text();

    // Then
    expect(response.status).toBe(502);
    expectHtmlHeaders(response);
    expect(html).toContain('<html lang="en">');
    expect(html).not.toContain("private relay failure");
  });

  test("maps an upstream redirect without Location to 502", async () => {
    // Given
    stubFetch(() => new Response(null, { status: 302 }));
    const handler = createConsentHandler(config);

    // When
    const response = await handler(postRequest(
      new URLSearchParams({ consent_challenge: "challenge-1", decision: "deny" }),
    ));

    // Then
    expect(response.status).toBe(502);
    expectHtmlHeaders(response);
  });
});
