# isbot-editing — packets

> See [../../packets/](../../packets/) for domain-level packet list.

## Execution units

### Packet 1: BFF GraphQL スキーマ・リゾルバー・型生成

- 内容
  - `bff/schema.graphql` の `UpdateProfileInput` に `isBot: Boolean` を追加する。
  - `bff/resolvers.ts` の `updateProfile` リゾルバーで `isBot` を `is_bot` にマッピングして Emumet へ送信する。
  - `bff/emumet/client.ts` / `real.ts` / `mock.ts` の `updateAccount` DTO に `isBot`（または `is_bot`）を追加する。
  - 必要に応じて `bff/loaders.ts` や `bff/context.ts` への影響を確認する（基本的に影響なしの見込み）。
  - `bun scripts/sync-graphql.ts` を実行し、`src/Generated/` 配下を更新する。
  - BFF テストに `isBot` 更新のケースを追加または既存ケースを拡張する。
- 完了条件
  - `bun test` が成功する。
  - `spago build` が成功する（生成型が整合している）。
- 推定規模：小

### Packet 2: フロントエンド UI 統合

- 内容
  - `src/Api/GraphQL/Types.purs` 等に `isBot` フィールドを追加する（必要に応じて）。
  - `src/Api/GraphQL.purs` の `updateProfile` ミューテーション / 取得 Query に `isBot` を含める。
  - `src/View/AccountDetail.purs` の編集フォームに「bot アカウント」チェックボックスを追加する。
  - `src/Update.purs`（またはクライアントアップデート）でフォーム状態と保存メッセージの処理を更新する。
  - `spago test` が成功することを確認する。
- 完了条件
  - アカウント詳細編集画面で `isBot` を切り替えられ、保存後に反映される。
  - `spago test` が成功する。
- 依存：Packet 1 完了後
- 推定規模：小

## Ordering

1. Packet 1 を実装し、BFF テストと PureScript ビルドが通ることを確認する。
2. Packet 2 を実装し、フロントテストと手動 Smoke テストを行う。
