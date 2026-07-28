# oauth2-consent — links

> See [overview.md](overview.md) for context.

## Reference links

### Source files

- `index.ts` — Bun dev server。`/auth/*` と `/graphql` を提供。ここに `/oauth2/consent` ルートを追加する候補。
- `bff/session.ts` — セッション seal/unseal、cookie ヘルパー。 consent ページでセッション確認が必要な場合に参照。
- `bff/context.ts` — リクエストごとのセッション解決。 consent エンドポイントで利用する可能性がある。
- `src/Server.purs` — SSR HTML 生成。 consent ページを PureScript + Flame でレンダリングする場合に修正。
- `src/App/Route.purs` — ルーティング定義。 consent ページを SPA 内に含める場合に追加（ただし consent は SPA 外が推奨）。
- `src/App/View/Layout.purs` — レイアウト。 consent ページ用にミニマルレイアウトを作る場合に参考。
- `src/App/View/Login.purs` — 既存の認証関連ページ。 consent ページのデザイン参考。
- `src/Client/Navigation.purs` / `src/Client/Navigation.js` — リダイレクト FFI。 consent フロー内で利用する可能性がある。
- `scripts/register-hydra-client.ts` — Hydra OAuth2 クライアント登録。 consent 設定を確認する際に関連。
- `scripts/dev.sh` — real モード起動スクリプト。E2E テスト時に使用。
- `bff/schema.graphql` — 本機能は直接的には GraphQL ではなく REST エンドポイントだが、関連コンテキストとして記載。

### Emumet endpoints

- `GET /oauth2/consent?consent_challenge=<challenge>` — 同意画面表示情報を返す。レスポンスは `{action: "show_consent", consent_challenge, client_name, requested_scope}` または 302 リダイレクト。
- `POST /oauth2/consent` — 同意または拒否を送信。ボディは `{ consent_challenge, accept: boolean, grant_scope?: string[] }`。レスポンスは 302 リダイレクト。

### Hydra docs / conventions

- Hydra consent flow: `https://www.ory.sh/docs/hydra/guides/consent`（参考）。プロンプト内の情報に基づく。
- PKCE / OAuth2 フローは既存 `AGENTS.md` および `README.md` の認証セクションを参照。

### Tooling / docs

- `README.md` — 認証モード、real/dev モード起動、環境変数。
- `AGENTS.md` — BFF 認証、SSR/クライアントハイドレーション、ルーティング。
- `intent-cli guide intent-work setup --kind tree-layout --domain ratcap --format markdown` — テンプレート生成コマンド。
