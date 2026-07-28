# account-deactivation — acceptance criteria

> [overview.md](overview.md) を参照。

## Criteria

- [ ] `bff/schema.graphql` に `deleteAccount(id: ID!): Boolean!` が追加されている。
- [ ] `bff/emumet/client.ts` の `EmumetClient` インターフェースに `deleteAccount(id: string): Promise<void>` が追加されている。
- [ ] `bff/emumet/real.ts` が `DELETE /api/v1/accounts/{id}` を呼び出し、204 を成功としてハンドリングしている。
- [ ] `bff/emumet/mock.ts` が `deleteAccount` を実装し、対象アカウントと紐づく profile / metadata を削除している。
- [ ] `bff/resolvers.ts` の `Mutation.deleteAccount` が未認証時に `extensions.code: UNAUTHENTICATED` を返す。
- [ ] `bun test` を実行した際、`deleteAccount` 関連のテストが追加され全て通る（既存テストも含めて 0 失敗）。
- [ ] `bun scripts/sync-graphql.ts` 実行後、`spago build` が成功する。
- [ ] `src/App/View/AccountDetail.purs` に「危険領域」セクションが追加され、削除確認ダイアログを開くボタンが配置されている。
- [ ] 確認ダイアログでアカウント名と一致しない文字列が入力されている間、削除実行ボタンが無効化されている。
- [ ] 確認ダイアログでアカウント名と一致する文字列を入力後、削除実行ボタンを押すと `deleteAccount` mutation が発行される。
- [ ] 削除成功後、ユーザーはアカウント一覧画面 (`/`) へ自動遷移する。
- [ ] 削除失敗時、エラーメッセージがダイアログまたはアカウント詳細画面に表示される。
