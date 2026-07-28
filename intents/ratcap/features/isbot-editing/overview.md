---
# Optional semantic facets (G529) — closed set, one line each:
#   vocabulary            — event/command vocabulary: what counts as a fact
#   invariant              — invariants and consistency boundaries
#   decider                — decider judgments: what a command decides
#   acceptance-property    — what must not break
# Uncomment and edit to annotate this node, e.g.:
# facets: [vocabulary]
---

# isbot-editing — overview

> **Ask intent-cli first:** `intent-cli guide intent-work setup --kind tree-layout --domain ratcap --format markdown`

## Goals

- フロントエンドからアカウントの `is_bot` フラグを編集できるようにする。
- BFF レイヤーで `UpdateProfileInput` に `isBot` を追加し、Emumet の `PATCH /api/v1/accounts/{id}` へのマッピングを完成させる。
- アカウント詳細編集画面に bot フラグ用のトグル UI を追加する。
- `spago bundle` および `bun scripts/sync-graphql.ts` による生成物更新までを含め、一連のビルド・テストが通る状態にする。

## Acceptance criteria summary

- `bff/schema.graphql` の `UpdateProfileInput` に `isBot: Boolean` が追加される。
- `bff/resolvers.ts` の `updateProfile` ミューテーションが `isBot` を `PATCH /api/v1/accounts/{id}` の `is_bot` フィールドへマッピングする。
- `bun scripts/sync-graphql.ts` 実行後、`src/Generated/` 配下の PureScript 型に `isBot` が反映される。
- アカウント詳細編集画面に「bot アカウント」チェックボックスが表示され、保存時に変更が反映される。
- `bun test`（BFF テスト）が成功する。
- `spago test`（PureScript テスト）が成功する。

## Related

- [requirements.md](requirements.md)
- [acceptance.md](acceptance.md)
- [decisions.md](decisions.md)
- [open-questions.md](open-questions.md)
- [packets.md](packets.md)
- [links.md](links.md)
