// ============================================================
// テスト共有ヘルパー — global fetch の stub と JSON Response 生成
// bun test からのみ import される (本番コードからは参照しない)。
// emumet-web/bff/test-utils.ts と同型だが、streaming upload を検証するため
// body は ReadableStream のまま保持し、duplex を別フィールドで記録する。
// ============================================================

export type FetchCall = {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: string | ReadableStream | undefined;
  readonly duplex: string | undefined;
};

export type FetchHandler = (call: FetchCall) => Response | Promise<Response>;

/** global fetch を差し替え、全呼出を記録する。戻り値の calls で順序・内容を検証する */
export function stubFetch(handler: FetchHandler): { calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const stub = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const rawBody = init?.body;
    const call: FetchCall = {
      url: String(input),
      method: init?.method ?? "GET",
      headers: (init?.headers ?? {}) as Record<string, string>,
      body:
        typeof rawBody === "string" ? rawBody
        : rawBody instanceof URLSearchParams ? rawBody.toString()
        : rawBody instanceof ReadableStream ? rawBody
        : undefined,
      // RequestInit 標準型に duplex は無い (streaming upload の undici/Bun 拡張)
      duplex: (init as RequestInit & { duplex?: string }).duplex,
    };
    calls.push(call);
    return Promise.resolve(handler(call));
  };
  Object.assign(globalThis, { fetch: stub });
  return { calls };
}

export function jsonResponse(status: number, body: unknown): Response {
  return Response.json(body, { status });
}

export function jsonBody(call: FetchCall): unknown {
  if (typeof call.body !== "string") throw new Error(`expected string body, got: ${typeof call.body}`);
  return JSON.parse(call.body);
}
