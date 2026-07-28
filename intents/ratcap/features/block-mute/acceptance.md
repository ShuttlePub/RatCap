# block-mute — acceptance criteria

> 目的は [overview.md](overview.md) を参照。

## Criteria

- [ ] `bff/schema.graphql` に `Relation` 型、 `RelationConnection` 型、 `blockAccount(accountId: ID!, target: String!): Boolean!` 、 `unblockAccount(accountId: ID!, target: String!): Boolean!` 、 `muteAccount(accountId: ID!, target: String!): Boolean!` 、 `unmuteAccount(accountId: ID!, target: String!): Boolean!` 、 `blocks(accountId: ID!): RelationConnection!` 、 `mutes(accountId: ID!): RelationConnection!` が追加されている。
- [ ] `bff/emumet/client.ts` の `EmumetClient` インターフェースに `block(accountId: string, target: string): Promise<void>` 、 `unblock(accountId: string, target: string): Promise<void>` 、 `mute(accountId: string, target: string): Promise<void>` 、 `unmute(accountId: string, target: string): Promise<void>` 、 `listBlocks(accountId: string): Promise<readonly Relation[]>` 、 `listMutes(accountId: string): Promise<readonly Relation[]>` が追加されている。
- [ ] `bff/emumet/real.ts` と `bff/emumet/mock.ts` が上記メソッドを実装しており、 `bun test` が実行可能な状態にある。
- [ ] `bff/resolvers.ts` の Query / Mutation に各リゾルバが追加され、未認証時は `UNAUTHENTICATED` エラーを返す。
- [ ] `bun test` でブロック / ミュート mutation / query のリゾルバテストが追加され、全テストが通る。
- [ ] `bun scripts/sync-graphql.ts` 実行後、 `src/Generated/` 配下の型が再生成され、 `spago build` が成功する。
- [ ] `src/App/Api/GraphQL.purs` に `blockAccount` / `unblockAccount` / `muteAccount` / `unmuteAccount` / `fetchBlocks` / `fetchMutes` の関数が追加される。
- [ ] `src/App/Message.purs` にブロック / ミュート関連の Message が追加される（例: `BlockAccount String String`、 `UnblockAccount String String`、 `MuteAccount String String`、 `UnmuteAccount String String`、 `FetchBlocks String`、 `FetchMutes String` など）。
- [ ] `src/App/Model.purs` にブロック / ミュート一覧の RemoteData 状態を保持するフィールドが追加される。
- [ ] `src/Client/Update.purs` に上記 Message のハンドラが追加され、操作成功後に状態を更新する。
- [ ] `src/App/View/AccountDetail.purs` にブロック / ミュート操作ボタンが追加される。
- [ ] ブロック / ミュート一覧画面または `src/App/View/Settings.purs` 内のセクションが追加され、一覧を表示する。
- [ ] `spago build` と `spago test` が成功する。
- [ ] `./scripts/dev.sh mock` 起動後、 mock アカウントでブロック / ミュートの追加・解除・一覧取得がブラウザ上で動作確認できる。
