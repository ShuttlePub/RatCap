# block-mute — open questions

> ドメイン全体の未解決問題は [../../clarifications/open.md](../../clarifications/open.md) を参照。

## Open questions blocking this feature

- ~~**管理一覧の配置場所**~~ **(2026-07-28 解決)**
  - 決定: 操作はアカウント個別ページ、一覧表示は Settings 配下。詳細は [decisions.md](decisions.md) を参照。

- **ブロック / ミュートボタンの表示条件**
  - 自分が Owner/Editor/Signer であるアカウントの詳細画面に対象入力欄を表示するか、それとも他者のアカウント詳細画面に対してボタンを表示するか未決定。
  - 現行の `SessionInfo` は `username` のみを保持しており、所有アカウントの一覧をクライアントが知る方法がない。

- **既存フォロー関係との連携**
  - ブロック実行時に既存のフォロー関係をどう扱うか（自動解除するか UI 上で表示するか）は Emumet 側の実装に依存するが、 Ratcap 側で明示的なメッセージを出す必要があるかどうか未決定。
  - 関連: `intents/ratcap/features/follow/`。

- **target_type の GraphQL 表現**
  - Emumet は `target_type` を文字列で返すが、 GraphQL 側で enum (`RelationTargetType`) に昇格させるか、 `String` のままにするか未決定。
  - enum にすると `bff/emumet/real.ts` の写像と PureScript 生成型の安定性が高まるが、 Emumet の新しい target タイプ追加時にスキーマ変更が必要になる。
