// ============================================================
// テスト/モックモード用 SessionAdapter。
// mock login が発行するセッションは refreshToken を持たない実署名 JWT
// (AppSession 形状) で、real adapter だと期限間近時に Hydra refresh を
// 試みてしまうため、refreshToken が無いセッションは refresh を完全に
// スキップして fresh を返す。refreshToken があるセッション
// (USE_TEST_JWT で real OAuth と併用する場合) は real adapter に委譲する。
// ============================================================

import {
  createSessionAdapter,
  type AppSession,
  type SessionAdapter,
  type SessionAdapterConfig,
} from "@shuttlepub/auth-bun";

export function createTestSessionAdapter(config: SessionAdapterConfig): SessionAdapter<AppSession> {
  const real = createSessionAdapter(config);
  return {
    getSession: (req) => real.getSession(req),
    sealSessionCookie: (session) => real.sealSessionCookie(session),
    clearSessionCookie: () => real.clearSessionCookie(),
    async refreshSessionIfNeeded(session: AppSession) {
      if (!session.refreshToken) return { kind: "fresh", accessToken: session.accessToken };
      return real.refreshSessionIfNeeded(session);
    },
  };
}
