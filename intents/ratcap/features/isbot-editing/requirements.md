# isbot-editing — requirements

> See [overview.md](overview.md) for goals.

## Functional requirements

- FR1: `bff/schema.graphql` の `UpdateProfileInput` 入力型に `isBot: Boolean` フィールドを追加する。デフォルト値は `null` または未定義とし、未指定時は既存値を維持する。
- FR2: `bff/resolvers.ts` の `updateProfile` リゾルバーが `args.input.isBot` を受け取り、Emumet クライアントの `updateAccount` 呼び出しに `is_bot` として含める。
- FR3: `bff/emumet/client.ts` および `bff/emumet/real.ts` / `bff/emumet/mock.ts` の `updateAccount` DTO に `isBot`（または Emumet 向け `is_bot`）フィールドを追加する。
- FR4: `src/Api/GraphQL/Types.purs` 等の App 側 DTO に `isBot` フィールドを追加する。必要に応じて `src/Generated/` 自動生成型も更新する。
- FR5: `src/View/AccountDetail.purs` の編集フォームに「bot アカウント」チェックボックスを追加し、保存ボタン押下時に `updateProfile` ミューテーションへ含める。
- FR6: 既存の `isBot` 値を表示時に反映させ、編集開始時に現在の値を初期表示する。
- FR7: GraphQL 型再生成 (`bun scripts/sync-graphql.ts`) 後、`spago build` がエラーなく完了する。

## Non-functional requirements

- NFR1: 既存のプロフィール編集フロー（displayName, summary, iconUrl, bannerUrl）を壊さない。
- NFR2: 本機能は小規模修正のため、新規ページ追加やルーティング変更を行わない。
- NFR3: テストカバレッジ：BFF 側は `bff/resolvers.test.ts` または同等のテストに `isBot` の更新ケースを 1 件追加する。PureScript 側はフロントテストがあればフォーム状態のケースを追加する。
- NFR4: 変更は `dev` / `mock` / `release` 全モードでビルド可能であること。
- NFR5: Emumet API の `is_bot` フィールドが boolean として返却される前提で、型変換は minimap（`isBot` ↔ `is_bot`）を通じて一元化する。
