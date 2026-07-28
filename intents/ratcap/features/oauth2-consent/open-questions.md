# oauth2-consent — open questions

> See [../../clarifications/open.md](../../clarifications/open.md) for domain-level open questions.

## Open questions blocking this feature

- ~~Q1: 同意 UI を Ratcap でホストするか、Emumet の既存テンプレートで済ませるか？~~ **(2026-07-28 解決)**
  - 決定: Ratcap でホストする。デザイン統一がしやすく、BFF が既に `/auth/*` で Hydra/Kratos と連携済みのため consent も BFF の守備範囲に入れるのが自然。Hydra consent URL の Ratcap 向け設定変更を伴う (decisions.md D6 参照)。
- Q2: `consent_challenge` はどのように Ratcap へ到達するか？
  - 背景：Hydra からユーザーがリダイレクトされる URL（例：`/oauth2/consent?consent_challenge=...`）は、Emumet が制御するか Ratcap が直接受けるかを決める必要がある。Emumet が受けてから Ratcap へ転送する場合、中継ロジックが増える。
  - 影響： consent エンドポイントの実装場所と、BFF 側のエンドポイント追加範囲。
- Q3: 同意画面は SSR ページとして生成するか、BFF 内で単純な HTML 文字列を返すか？
  - 背景：Ratcap は PureScript + Flame SSR 対応だが、同意ページは SPA ライフサイクルが不要。シンプルな HTML テンプレートで十分な可能性がある。
  - 影響： `Server.purs` 変更の有無、ビルド時間、テスト方法。
- Q4: 「拒否」時の最終的な遷移先はどうするか？
  - 背景：Hydra は拒否時に `error=access_denied` 等を含むリダイレクト URI を返すが、Ratcap 側で追加の誘導（トップページへ戻す等）が必要か。
  - 影響：エラーハンドリング UI の範囲。
- Q5: 未ログイン時に `/oauth2/consent` へ直接アクセスされた場合、どこへ誘導するか？
  - 背景：Kratos ログイン前に consent ページが呼ばれる可能性がある。Ratcap ログインページへ戻すか、Kratos ログインフローへ転送するか。
  - 影響：セッション管理とエンドポイントの連携。
- Q6: 同意ページに表示するスコープ名をそのまま表示するか、日本語ラベルマップを用意するか？
  - 背景：`openid`, `offline_access`, `email` 等のスコープをユーザーにどのように提示するか。
  - 影響： i18n 方針と UI テキストの設計。
