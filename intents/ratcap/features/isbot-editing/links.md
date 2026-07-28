# isbot-editing — links

> See [overview.md](overview.md) for context.

## Reference links

### Source files

- `bff/schema.graphql` — GraphQL SDL。`UpdateProfileInput` の定義箇所。
- `bff/resolvers.ts` — `updateProfile` ミューテーションリゾルバー。
- `bff/emumet/client.ts` — `EmumetClient` インターフェースと `updateAccount` DTO。
- `bff/emumet/real.ts` — Emumet REST 実装。`is_bot` へのマッピング箇所。
- `bff/emumet/mock.ts` — In-memory mock 実装。テスト用状態保持。
- `bff/loaders.ts` — DataLoader（本機能では影響少）。
- `src/Api/GraphQL.purs` — PureScript から BFF `/graphql` へ呼び出すクライアント。
- `src/Api/GraphQL/Types.purs` — App 側の GraphQL DTO 型。
- `src/Generated/` — `bun scripts/sync-graphql.ts` 自動生成型。
- `src/View/AccountDetail.purs` — アカウント詳細 / 編集画面。
- `src/Update.purs`（または `src/Client/Update.purs`）— フォーム状態・保存メッセージ処理。
- `scripts/sync-graphql.ts` — SDL → PureScript 型生成スクリプト。

### Emumet endpoints

- `PATCH /api/v1/accounts/{id}` — アカウント更新。リクエストボディに `is_bot` フィールドを含める。
- `GET /api/v1/accounts/{id}`（または一覧取得）— 読み出し時の `is_bot` 値確認用。

### Tooling / docs

- `README.md` の「GraphQL の型再生成」セクション。
- `AGENTS.md` の「BFF データ API」セクション。
- `intent-cli guide intent-work setup --kind tree-layout --domain ratcap --format markdown` — テンプレート生成コマンド。
