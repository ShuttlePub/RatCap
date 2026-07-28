# follow — acceptance criteria

> [overview.md](overview.md) を参照。

## Criteria

- [ ] `bff/schema.graphql` に `FollowResult` 型が追加されている。
- [ ] `bff/schema.graphql` の `Mutation` に `followAccount(accountId: ID!, target: String!): FollowResult!` が追加されている。
- [ ] `bff/emumet/client.ts` に `FollowResult` 型と `followAccount(accountId: string, target: string): Promise<FollowResult>` メソッドが追加されている。
- [ ] `bff/emumet/real.ts` が `POST /api/v1/accounts/{accountId}/follow` を呼び出し、レスポンスを camelCase に変換している。
- [ ] `bff/emumet/mock.ts` が `followAccount` を実装し、フォロー状態をインメモリで保持している（一覧対応を見据えて）。
- [ ] `bff/resolvers.ts` の `Mutation.followAccount` が未認証時に `extensions.code: UNAUTHENTICATED` を返す。
- [ ] `bun test` を実行した際、`followAccount` 関連のテストが追加され全て通る（既存テストも含めて 0 失敗）。
- [ ] `bun scripts/sync-graphql.ts` 実行後、`spago build` が成功する。
- [ ] `src/App/View/AccountDetail.purs` にフォロー対象入力欄と「フォロー」ボタンが追加されている。
- [ ] 空文字列の状態ではフォローボタンが無効化されている。
- [ ] フォロー成功時、結果として `remoteActorUrl`, `activityId`, `approved` が画面に表示される。
- [ ] フォロー失敗時、エラーメッセージがアカウント詳細画面に表示される。
- [ ] フォロー実行中はボタンが無効化され、ローディング状態が示される。
