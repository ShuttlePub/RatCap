# block-mute — links

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
- PureScript ルート定義: `src/App/Route.purs`
- PureScript モデル: `src/App/Model.purs`
- PureScript Message: `src/App/Message.purs`
- PureScript クライアント更新: `src/Client/Update.purs`
- PureScript GraphQL API: `src/App/Api/GraphQL.purs`
- PureScript GraphQL DTO: `src/App/Api/GraphQL/Types.purs`
- アカウント詳細 View: `src/App/View/AccountDetail.purs`
- 設定 View: `src/App/View/Settings.purs`
- トップレベル View: `src/App/View.purs`
- 生成型ディレクトリ: `src/Generated/`

### Emumet エンドポイント

- `POST /api/v1/accounts/{id}/block` — ブロック追加
- `POST /api/v1/accounts/{id}/unblock` — ブロック解除
- `GET /api/v1/accounts/{id}/blocks` — ブロック一覧
- `POST /api/v1/accounts/{id}/mute` — ミュート追加
- `POST /api/v1/accounts/{id}/unmute` — ミュート解除
- `GET /api/v1/accounts/{id}/mutes` — ミュート一覧

### 関連機能

- `intents/ratcap/features/follow/` — フォロー関係との重複 / 排他動作を検討する際に参照。
- `intents/ratcap/features/account-deactivation/` — BFF mutation 追加パターンの参考実装。
- `intents/ratcap/features/settings-hub/` — 設定画面に一覧を配置する場合の配置パターン参考。
