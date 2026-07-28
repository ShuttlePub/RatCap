# follow — links

> [overview.md](overview.md) を参照。

## Reference links

### ソースファイル
- `bff/schema.graphql` — GraphQL SDL（`FollowResult` / `followAccount` 追加先）
- `bff/emumet/client.ts` — `EmumetClient` 抽象と `FollowResult` 型定義追加先
- `bff/emumet/real.ts` — REST 実装（`POST /api/v1/accounts/{accountId}/follow` 呼び出し先）
- `bff/emumet/mock.ts` — インメモリ mock 実装
- `bff/resolvers.ts` — GraphQL リゾルバ
- `bff/*.test.ts` — BFF テスト群
- `src/Generated/` — `bun scripts/sync-graphql.ts` による生成型
- `src/App/Api/GraphQL.purs` — PureScript GraphQL クライアント
- `src/App/Api/GraphQL/Types.purs` — App 側 DTO 型
- `src/App/Model.purs` — Model / form 状態
- `src/App/Message.purs` — Message ADT
- `src/App/View/AccountDetail.purs` — アカウント詳細画面（フォロー UI 追加先）
- `src/Client/Update.purs` — クライアント update 関数
- `src/App/Route.purs` — ルーティング定義

### Emumet バックエンドエンドポイント
- `POST /api/v1/accounts/{account_id}/follow` — フォロー実行（OAuth2 Bearer、Body `{ target: String }`）
- レスポンス: `{ follow_id, remote_actor_url, activity_id, approved }`

### 関連 intent ドキュメント
- `intents/ratcap/features/account-deactivation/` — アカウント削除時にフォロー関係が連動する場合に参照
- `intents/ratcap/features/settings-hub/` — 将来的にフォロー/フォロワー管理を設定ハブに移動する場合に参照
