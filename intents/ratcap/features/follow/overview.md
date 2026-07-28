---
---

# follow — overview

> 関連: [requirements.md](requirements.md) / [acceptance.md](acceptance.md) / [decisions.md](decisions.md) / [open-questions.md](open-questions.md) / [packets.md](packets.md)

## Goals

- ユーザーが所有/署名/編集権限を持つアカウントから、外部 ActivityPub アクターをフォローできるようにする。
- フォロー対象は nanoid、actor URL、`acct:user@domain` のいずれかを入力できるシンプルなフォームで受け付ける。
- フォロー実行後、成功/失敗のフィードバックを即座に表示する。
- フォロー成功で返却される `follow_id`, `remote_actor_url`, `activity_id`, `approved` をフロントエンドで表示する（初回 slice）。
- フォロー/フォロワー一覧は ActivityPub collections で取得するため、初回 slice ではスコープ外とする。

## Acceptance criteria summary

- `bff/schema.graphql` に `followAccount` mutation と `FollowResult` 型が追加される。
- `bff/emumet/client.ts` の `EmumetClient` 契約に `followAccount` メソッドが追加され、`real.ts` / `mock.ts` の両方が実装される。
- `bff/resolvers.ts` に `followAccount` リゾルバが実装される。
- PureScript 側で生成型を再生成後、`spago build` が成功する。
- アカウント詳細画面に「フォロー」セクション/フォームが追加され、対象入力後に mutation を発行できる。
- フォロー成功時は `FollowResult` のフィールドを表示する。失敗時はエラーメッセージを表示する。
- `bun test` の BFF テストに `followAccount` リゾルバのテストが追加され全て通る。
