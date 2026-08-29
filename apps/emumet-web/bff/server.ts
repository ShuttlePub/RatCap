// ============================================================
// Yoga 統合 — createYogaHandler(adapter, createEmumetClient)
// schema: bff/schema.ts (SDL) + bff/resolvers.ts
// context: bff/context.ts の buildContext (SessionAdapter / EmumetClient
//          ファクトリは index.ts が USE_MOCK に応じて DI する)
// セッション cookie: @whatwg-node/server-plugin-cookies / CookieStore は
//   HttpOnly を再現できないため不採用。context 構築時に sessionCookieHeader
//   が非 null なら WeakMap<Request, string> に保持し、Yoga プラグインの
//   onResponse フックで既存形式の Set-Cookie 文字列をそのまま append する。
// ============================================================

import { createYoga } from "graphql-yoga";
import { makeSchema } from "./schema.ts";
import { resolvers } from "./resolvers.ts";
import { buildContext, type ContextDeps, type GraphQLContext } from "./context.ts";
import type { SessionAdapter } from "@shuttlepub/auth-bun";
import type { EmumetClient } from "./emumet/client.ts";

// request → context → onResponse 間の受け渡しキャリア。
// WeakMap のためレスポンス処理後のエントリは GC に任せられる (明示 delete 不要)。
const sessionCookieHeaders = new WeakMap<Request, string>();

export function createYogaHandler(
  adapter: SessionAdapter<{ accessToken: string }>,
  createEmumetClient: (accessToken: string) => EmumetClient,
): (req: Request) => Promise<Response> {
  const deps: ContextDeps = { adapter, createEmumetClient };

  const yoga = createYoga({
    schema: makeSchema(resolvers),
    graphqlEndpoint: "/graphql",
    context: async (initial): Promise<GraphQLContext> => {
      const context = await buildContext(initial.request, deps);
      if (context.sessionCookieHeader !== null) {
        sessionCookieHeaders.set(initial.request, context.sessionCookieHeader);
      }
      return context;
    },
    plugins: [
      {
        onResponse({ request, response }) {
          const header = sessionCookieHeaders.get(request);
          if (header !== undefined) {
            response.headers.append("Set-Cookie", header);
          }
        },
      },
    ],
  });

  // Bun 1.3.1+ の型問題回避のため Bun.serve には直接渡さず、
  // index.ts の既存 fetch 内からこの関数を呼ぶ (yoga.fetch はメソッド呼出で this を保持)
  return async (req) => await yoga.fetch(req);
}
