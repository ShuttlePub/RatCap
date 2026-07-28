# account-deactivation — links

> [overview.md](overview.md) を参照。

## Reference links

### ソースファイル
- `bff/schema.graphql` — GraphQL SDL（`deleteAccount` mutation 追加先）
- `bff/emumet/client.ts` — `EmumetClient` 抽象インターフェース
- `bff/emumet/real.ts` — REST 実装（`DELETE /api/v1/accounts/{id}` 呼び出し先）
- `bff/emumet/mock.ts` — インメモリ mock 実装
- `bff/resolvers.ts` — GraphQL リゾルバ
- `bff/*.test.ts` — BFF テスト群
- `src/Generated/` — `bun scripts/sync-graphql.ts` による生成型
- `src/App/Api/GraphQL.purs` — PureScript GraphQL クライアント
- `src/App/Api/GraphQL/Types.purs` — App 側 DTO 型
- `src/App/Model.purs` — Model / form 状態
- `src/App/Message.purs` — Message ADT
- `src/App/View/AccountDetail.purs` — アカウント詳細画面（危険領域追加先）
- `src/Client/Update.purs` — クライアント update 関数
- `src/Client/Navigation.purs` / `src/Client/Navigation.js` — 遷移 FFI
- `src/App/Route.purs` — ルーティング定義（`Home` 遷移用）

### Emumet バックエンドエンドポイント
- `DELETE /api/v1/accounts/{account_id}` — アカウント削除（OAuth2 Bearer、Owner only、204 No Content、カスケード削除）

### 関連 intent ドキュメント
- `intents/ratcap/features/settings-hub/` — 設定ハブから danger-zone へ導線を貼る場合に参照
- `intents/ratcap/features/follow/` — フォロー機能（アカウント削除時にフォロー関係も連動する場合）
