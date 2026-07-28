# admin-moderation — acceptance criteria

> 目的は [overview.md](overview.md) を参照。

## Criteria

- [ ] `bff/schema.graphql` に `suspendAccount(id: ID!, reason: String!, expiresAt: DateTime): Boolean!` 、 `unsuspendAccount(id: ID!): Boolean!` 、 `banAccount(id: ID!, reason: String!): Boolean!` mutation が追加されている。
- [ ] `bff/schema.graphql` の既存 `Moderation` 型、 `ModerationType` enum が活用され、 `Account.moderation` フィールドはそのまま利用される。
- [ ] `bff/emumet/client.ts` の `EmumetClient` インターフェースに `suspendAccount(id: string, reason: string, expiresAt: string | null): Promise<void>` 、 `unsuspendAccount(id: string): Promise<void>` 、 `banAccount(id: string, reason: string): Promise<void>` が追加されている。
- [ ] `bff/emumet/real.ts` と `bff/emumet/mock.ts` が上記メソッドを実装しており、 `mock.ts` では状態が更新され即座に `Account.moderation` フィールドに反映される。
- [ ] `bff/context.ts` または `bff/resolvers.ts` で admin role 判定を行い、admin 以外からの管理 mutation は `FORBIDDEN` エラーとなる。
- [ ] `bff/resolvers.ts` に 3 つの admin-only mutation リゾルバが実装される。
- [ ] `bun test` に admin 判定・suspend / unsuspend / ban のテストが追加され、全テストが通る。
- [ ] `bun scripts/sync-graphql.ts` 実行後、 `src/Generated/` 配下の型が再生成され、 `spago build` が成功する。
- [ ] `src/App/Api/GraphQL.purs` に `suspendAccount` / `unsuspendAccount` / `banAccount` の関数が追加される。
- [ ] `src/App/Model.purs` の `SessionInfo` に `isAdmin :: Boolean` のような admin role フラグが追加されるか、または別途 admin 判定用の情報取得方法が追加される。
- [ ] `src/App/Message.purs` に管理操作の Message（例: `SuspendAccount String String (Maybe String)` 、 `UnsuspendAccount String` 、 `BanAccount String String`）が追加される。
- [ ] `src/App/Api/Auth.purs` または `src/App/Api/Client.purs` の `SessionResponse` デコーダに admin フラグを含める改修が行われる。
- [ ] `src/App/View/AccountDetail.purs` にモデレーション状態バッジを表示し、停止中は理由と有効期限を、BAN 中は理由と BAN 日時を表示する。
- [ ] admin セッション時のみ、 `src/App/View/AccountDetail.purs` に停止フォーム（理由 + 任意期限）、停止解除ボタン、BAN フォーム（理由 + 強力確認）を表示する。
- [ ] `src/Client/Update.purs` に管理操作の Message ハンドラが追加され、成功後はアカウント詳細を再フェッチして状態を更新する。
- [ ] `spago build` と `spago test` が成功する。
- [ ] `./scripts/dev.sh mock` 起動後、admin ロール付き mock ユーザーで停止 / BAN / 停止解除の一連の操作がブラウザで確認できる。