// ============================================================
// テスト共有ヘルパー — global fetch の stub と JSON Response 生成
// bun test からのみ import される (本番コードからは参照しない)。
// ============================================================

export type FetchCall = {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: string | undefined;
};

export type FetchHandler = (call: FetchCall) => Response | Promise<Response>;

/** global fetch を差し替え、全呼出を記録する。戻り値の calls で順序・内容を検証する */
export function stubFetch(handler: FetchHandler): { calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const stub = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    // stub 境界: 被テスト実装 (real.ts / session.ts) は常にプレーンオブジェクトの
    // headers を渡すため、ここでその形に絞る。body は string (real.ts) と
    // URLSearchParams (session.ts) の両方を文字列に正規化する
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const rawBody = init?.body;
    const call: FetchCall = {
      url: String(input),
      method: init?.method ?? "GET",
      headers,
      body:
        typeof rawBody === "string" ? rawBody
        : rawBody instanceof URLSearchParams ? rawBody.toString()
        : undefined,
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
