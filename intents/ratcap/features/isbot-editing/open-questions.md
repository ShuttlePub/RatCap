# isbot-editing — open questions

> See [../../clarifications/open.md](../../clarifications/open.md) for domain-level open questions.

## Open questions blocking this feature

- Q1: `isBot` の初期値は `account` / `profile` のどちらの GraphQL 型から取得するか？
  - 背景：現状アカウント詳細画面で取得する型に `isBot` が含まれているか、もしくは含める必要があるかを確認する。
  - 影響：読み出し Query（`src/Api/GraphQL.purs`）の修正範囲が変わる。
- Q2: Emumet の `PATCH /api/v1/accounts/{id}` は `is_bot` を部分更新（partial update）で受け付けるか？
  - 背景：省略時にエラーにならないか、他のフィールドと同じ挙動かを確認する。
  - 影響：BFF 側で `isBot` を optional/nullable にすべきかどうかの判断。
- Q3: bot フラグ切り替え時にユーザーへの警告や確認ダイアログが必要か？
  - 背景：bot フラグは ActivityPub 連合に影響を与える可能性がある。
  - 影響：単純なチェックボックスで済ませるか、確認フローを挟むかの UI 設計。
