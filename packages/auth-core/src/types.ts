export type AppSession = {
  v: 1;
  sub?: string;
  email?: string;
  name?: string;
  accessToken: string;
  refreshToken?: string;
  tokenType: "Bearer";
  scope: string;
  expiresAt: number; // Unix timestamp
};

// Mock session (simple base64 JSON — NOT encrypted)
export type MockSession = { token: string; username: string };

/** Mock adapter が返すセッション: MockSession.token を accessToken として露出する */
export type MockAdapterSession = { accessToken: string; username: string };

export type PendingOAuth = {
  v: 1;
  state: string;
  codeVerifier: string;
  returnTo: string;
  expiresAt: number; // Unix timestamp
};

/**
 * lazy refresh の結果 (index.ts proxyToEmumet / handleRealAuth /auth/session と同一の 3-way + no-op):
 * - fresh:                 refresh 不要 → 現 token を使用、Set-Cookie なし
 * - refreshed:             refresh 成功 → 新 token を使用、seal 済み cookie を送信
 * - refresh-failed-active: refresh 失敗かつ未期限切れ → 現 token をそのまま使用、Set-Cookie なし
 * - refresh-failed-expired: refresh 失敗かつ期限切れ → 未認証扱い、clear-cookie (Max-Age=0) を送信
 */
export type RefreshOutcome =
  | { kind: "fresh"; accessToken: string }
  | { kind: "refreshed"; accessToken: string; sessionCookieHeader: string }
  | { kind: "refresh-failed-active"; accessToken: string }
  | { kind: "refresh-failed-expired"; sessionCookieHeader: string };
