# isbot-editing — acceptance criteria

> See [overview.md](overview.md) for goals.

## Criteria

- [ ] AC1: `bff/schema.graphql` の `UpdateProfileInput` に `isBot: Boolean` が追加され、SDL に構文エラーがない。
- [ ] AC2: `bun scripts/sync-graphql.ts` を実行後、`src/Generated/` 配下の PureScript 型が `isBot` を含むよう更新される。
- [ ] AC3: `bff/resolvers.ts` の `updateProfile` が `input.isBot` を `PATCH /api/v1/accounts/{id}` の `is_bot` として送信する。
- [ ] AC4: `bff/emumet/real.ts` / `mock.ts` の `updateAccount` DTO に `isBot`（または `is_bot`）が追加され、mock 状態でも保存・読み出しできる。
- [ ] AC5: `src/Api/GraphQL/Types.purs` 等の App 側 DTO に `isBot` が追加される。
- [ ] AC6: `src/View/AccountDetail.purs` の編集フォームに「bot アカウント」チェックボックスが表示され、クリックで状態が切り替わる。
- [ ] AC7: 保存ボタン押下で GraphQL `updateProfile` ミューテーションが `isBot` を含み、成功時に再読み込みまたはリダイレクトで最新値を反映する。
- [ ] AC8: `bun test` が全件成功する。
- [ ] AC9: `spago test` が全件成功する。
- [ ] AC10: 既存プロフィール編集（displayName, summary, iconUrl, bannerUrl）の手動 Smoke テストを行い、リグレッションがないことを確認する。
