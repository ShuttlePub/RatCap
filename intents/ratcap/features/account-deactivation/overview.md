---
---

# account-deactivation — overview

> 関連: [requirements.md](requirements.md) / [acceptance.md](acceptance.md) / [decisions.md](decisions.md) / [open-questions.md](open-questions.md) / [packets.md](packets.md)

## Goals

- ユーザーが自身が所有するアカウントを Ratcap 上から削除できるようにする。
- 削除実行前に確認ダイアログを表示し、意図しないアカウント消失を防ぐ。
- 削除成功後はアカウント一覧画面へ遷移し、即座に一覧が更新される状態にする。
- BFF レイヤーに `deleteAccount` GraphQL mutation を追加し、Emumet の `DELETE /api/v1/accounts/{account_id}` を呼び出す。

## Acceptance criteria summary

- `bff/schema.graphql` に `deleteAccount(id: ID!): Boolean!` mutation が追加される。
- `bff/emumet/client.ts` の `EmumetClient` 契約に `deleteAccount` メソッドが追加され、`real.ts` / `mock.ts` の両方が実装される。
- `bff/resolvers.ts` に `deleteAccount` リゾルバが実装され、未認証時は `UNAUTHENTICATED`、成功時は `true` を返す。
- PureScript 側で生成型を再生成後、`spago build` が成功する。
- アカウント詳細画面に「危険領域」セクションが追加され、確認ダイアログでアカウント名を入力して一致した場合のみ削除を実行する。
- 削除成功後、自動でアカウント一覧 (`/`) へ遷移する。
- `bun test` の BFF テストに `deleteAccount` リゾルバのテストが追加され全て通る。
