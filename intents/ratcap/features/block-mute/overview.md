---
---

# block-mute — overview

> 関連: [requirements.md](requirements.md) / [acceptance.md](acceptance.md) / [decisions.md](decisions.md) / [open-questions.md](open-questions.md) / [packets.md](packets.md)

## Goals

- ユーザーが自分のアカウントから見た「ブロック」「ミュート」の対象を追加・削除できるようにする。
- 対象は Emumet が受け入れる任意の識別子（ローカル nanoid、リモート actor URL、`acct:user@domain`）を指定できる。
- ブロック / ミュート状態を一覧で確認・管理できる UI を提供する。
- BFF レイヤーに `blockAccount` / `unblockAccount` / `muteAccount` / `unmuteAccount` の GraphQL mutation と、`blocks` / `mutes` の query を追加し、Emumet のブロック / ミュート REST API を呼び出す。
- 既存のアカウント詳細画面にブロック / ミュート操作ボタンを追加する。

## Acceptance criteria summary

- `bff/schema.graphql` に `Relation` 型と `blockAccount` / `unblockAccount` / `muteAccount` / `unmuteAccount` mutation、 `blocks` / `mutes` query が追加される。
- `bff/emumet/client.ts` の `EmumetClient` 契約に `block` / `unblock` / `mute` / `unmute` / `listBlocks` / `listMutes` メソッドが追加され、`real.ts` / `mock.ts` の両方が実装される。
- `bff/resolvers.ts` に各リゾルバが実装され、未認証時は `UNAUTHENTICATED`、成功時は `Boolean` または `RelationConnection` を返す。
- PureScript 側で生成型を再生成後、`spago build` が成功する。
- アカウント詳細画面にブロック / ミュートボタンが追加され、操作後は状態が即座に反映される。
- ブロック / ミュート一覧画面（またはセクション）が追加され、対象の識別子と種別を表示する。
- `bun test` の BFF テストにブロック / ミュートリゾルバのテストが追加され全て通る。

## Related

- [requirements.md](requirements.md)
- [acceptance.md](acceptance.md)
- [decisions.md](decisions.md)
- [open-questions.md](open-questions.md)
- [packets.md](packets.md)
