# admin-moderation — links

> 目的は [overview.md](overview.md) を参照。

## Reference links

### 関連ソースファイル

- BFF GraphQL スキーマ: `bff/schema.graphql`
- BFF Emumet クライアント契約: `bff/emumet/client.ts`
- BFF Emumet リアル実装: `bff/emumet/real.ts`
- BFF Emumet モック実装: `bff/emumet/mock.ts`
- BFF リゾルバ: `bff/resolvers.ts`
- BFF コンテキスト: `bff/context.ts`
- BFF サーバー: `bff/server.ts`
- BFF セッション: `bff/session.ts`
- サーバー入口: `index.ts`
- PureScript ルート定義: `src/App/Route.purs`
- PureScript モデル: `src/App/Model.purs`
- PureScript Message: `src/App/Message.purs`
- PureScript クライアント更新: `src/Client/Update.purs`
- PureScript Auth API: `src/App/Api/Auth.purs`
- PureScript GraphQL API: `src/App/Api/GraphQL.purs`
- PureScript GraphQL DTO: `src/App/Api/GraphQL/Types.purs`
- アカウント詳細 View: `src/App/View/AccountDetail.purs`
- レイアウト View: `src/App/View/Layout.purs`
- トップレベル View: `src/App/View.purs`
- 生成型ディレクトリ: `src/Generated/`

### Emumet エンドポイント

- `GET /api/v1/me` — セッションコンテキスト取得（ShuttlePub/Emumet#18、 ADR 0004）。レスポンス `{ account_id: AuthAccountId, instance_roles: ["admin" | "moderator"] }`。ロールなしは `200` + 空配列、 Keto 障害は `503`、未認証は `401`。
- `POST /api/v1/admin/accounts/{id}/suspend` — アカウント停止（body: `{ reason: String!, expires_at?: DateTime }`）
- `POST /api/v1/admin/accounts/{id}/unsuspend` — アカウント停止解除
- `POST /api/v1/admin/accounts/{id}/ban` — アカウント BAN（body: `{ reason: String! }`）
- `GET /api/v1/accounts/{id}` または既存アカウント取得エンドポイント — レスポンスの `moderation` フィールドを使用

### 関連機能

- `intents/ratcap/features/account-deactivation/` — BFF mutation 追加パターンの参考実装。
- `intents/ratcap/features/settings-hub/` — 管理 UI を設定画面に配置する場合の配置パターン参考。
- `intents/ratcap/features/block-mute/` — 同様の「アカウントに対する操作」UI パターン参考。