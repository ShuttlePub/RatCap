// ============================================================
// GraphQL context — SessionAdapter 経由のセッション解決 + 認証
// アダプタと EmumetClient ファクトリは index.ts から DI される。
// ============================================================

import type { SessionAdapter } from "./session.ts";
import type { EmumetClient } from "./emumet/client.ts";

/**
 * T5 (bff/loaders.ts) で DataLoader 群に置き換わるプレースホルダ。
 * makeLoaders() のファクトリシグネチャをここで固定し、リクエスト単位の
 * loader 生成をリゾルバ側から呼べるようにする。
 */
export type Loaders = Record<string, never>;

export type GraphQLContext = {
  readonly accessToken: string | null;
  readonly emumet: EmumetClient | null;
  /** 非 null ならレスポンスに Set-Cookie として付与する (refresh 成功時の seal 済み / 期限切れ時の clear-cookie) */
  readonly sessionCookieHeader: string | null;
  makeLoaders(): Loaders;
};

export type ContextDeps = {
  readonly adapter: SessionAdapter<{ accessToken: string }>;
  /** 認証済みリクエストでのみ呼ばれる。Real: token から Real client、Mock: プロセス共有の Mock client を返す */
  readonly createEmumetClient: (accessToken: string) => EmumetClient;
};

export async function buildContext(req: Request, deps: ContextDeps): Promise<GraphQLContext> {
  const session = await deps.adapter.getSession(req);
  if (!session) return unauthenticatedContext(null);

  const outcome = await deps.adapter.refreshSessionIfNeeded(session);
  switch (outcome.kind) {
    case "fresh":
    case "refresh-failed-active":
      return authenticatedContext(deps, outcome.accessToken, null);
    case "refreshed":
      return authenticatedContext(deps, outcome.accessToken, outcome.sessionCookieHeader);
    case "refresh-failed-expired":
      return unauthenticatedContext(outcome.sessionCookieHeader);
  }
}

function authenticatedContext(deps: ContextDeps, accessToken: string, sessionCookieHeader: string | null): GraphQLContext {
  const emumet = deps.createEmumetClient(accessToken);
  return {
    accessToken,
    emumet,
    sessionCookieHeader,
    makeLoaders: () => {
      // T5: emumet (クロージャ捕捉) から DataLoader を構築する
      return {};
    },
  };
}

function unauthenticatedContext(sessionCookieHeader: string | null): GraphQLContext {
  return { accessToken: null, emumet: null, sessionCookieHeader, makeLoaders: () => ({}) };
}
