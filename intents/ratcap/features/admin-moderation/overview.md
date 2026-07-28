---
---

# admin-moderation — overview

> 関連: [requirements.md](requirements.md) / [acceptance.md](acceptance.md) / [decisions.md](decisions.md) / [open-questions.md](open-questions.md) / [packets.md](packets.md)

## Goals

- モデレーター（admin role）が Ratcap 上からアカウントを停止（suspend）・ BAN・停止解除（unsuspend）できるようにする。
- 停止 / BAN には理由を必須とし、停止には任意の有効期限を設定できる。
- アカウント詳細画面にモデレーション状態（停止中 / BAN / なし）を表示する。
- BFF レイヤーに `suspendAccount` / `unsuspendAccount` / `banAccount` の GraphQL mutation を追加し、Emumet の管理用 REST API を呼び出す。
- 管理操作は admin role を持つセッションのみに許可する。

## Acceptance criteria summary

- `bff/schema.graphql` に既存の `Moderation` 型を使用し、 `suspendAccount(id: ID!, reason: String!, expiresAt: DateTime): Boolean!` 、 `unsuspendAccount(id: ID!): Boolean!` 、 `banAccount(id: ID!, reason: String!): Boolean!` mutation が追加される。
- BFF コンテキストに admin role 判定を追加し、admin 以外のリクエストは `FORBIDDEN` または `UNAUTHENTICATED` エラーを返す。
- `bff/emumet/client.ts` の `EmumetClient` 契約に `suspendAccount` / `unsuspendAccount` / `banAccount` メソッドが追加され、`real.ts` / `mock.ts` の両方が実装される。
- `bff/resolvers.ts` に admin-only のリゾルバが実装される。
- PureScript 側で生成型を再生成後、`spago build` が成功する。
- アカウント詳細画面にモデレーション状態バッジ（停止中 / BAN）を表示し、理由と有効期限を表示する。
- admin ユーザーに限り、詳細画面に停止 / 停止解除 / BAN 操作フォームを表示する。
- BAN 操作は強力な確認ダイアログ（アカウント名の入力など）を挟む。
- `bun test` の BFF テストに admin 判定付きリゾルバテストが追加され全て通る。

## Related

- [requirements.md](requirements.md)
- [acceptance.md](acceptance.md)
- [decisions.md](decisions.md)
- [open-questions.md](open-questions.md)
- [packets.md](packets.md)
