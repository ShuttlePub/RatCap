---
# Optional semantic facets (G529) — closed set, one line each:
#   vocabulary            — event/command vocabulary: what counts as a fact
#   invariant              — invariants and consistency boundaries
#   decider                — decider judgments: what a command decides
#   acceptance-property    — what must not break
# Uncomment and edit to annotate this node, e.g.:
# facets: [vocabulary]
---

# oauth2-consent — overview

> **Ask intent-cli first:** `intent-cli guide intent-work setup --kind tree-layout --domain ratcap --format markdown`

## Goals

- Hydra の consent フローで「手動同意（manual consent）」が要求された場合に、ユーザーがクライアント名と要求スコープを確認して同意/拒否できる UI を提供する。
- Emumet の `GET /oauth2/consent` と `POST /oauth2/consent` を BFF または直接ルーティングで呼び出し、 consent_challenge を受け渡す。
- 現在 auto-skip されている consent フローが無効化された場合でも、OAuth2 認可コードフローが正常に完了するようにする。
- 同意ページは OAuth2 ダンスの一部として動作し、Ratcap 外の他の OAuth2 クライアントからもアクセス可能であることを考慮する。

## Acceptance criteria summary

- `GET /oauth2/consent?consent_challenge=...` へのリクエストが、HTML 同意ページまたは 302 リダイレクトのいずれかを適切に返す。
- 同意ページにはクライアント名（`client_name`）と要求スコープ一覧（`requested_scope`）が表示される。
- 「許可」ボタンで `POST /oauth2/consent`（`accept: true`）が実行され、Hydra からの 302 リダイレクトに従う。
- 「拒否」ボタンで `POST /oauth2/consent`（`accept: false`）が実行され、適切なエラー画面またはリダイレクト先に遷移する。
- 未ログイン時や consent_challenge 不正時のエラーハンドリングが実装される。
- 実装方針（Ratcap 内 standalone SSR ページ vs 他の実装場所）が決定され、関連ドキュメントに記録される。

## Related

- [requirements.md](requirements.md)
- [acceptance.md](acceptance.md)
- [decisions.md](decisions.md)
- [open-questions.md](open-questions.md)
- [packets.md](packets.md)
- [links.md](links.md)
