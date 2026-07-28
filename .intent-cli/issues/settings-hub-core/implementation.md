# settings-hub-core Implementation Packet

## Goal

プレースホルダー状態の Settings 画面 (`src/App/View/Settings.purs`) を、今後の設定系機能 (account-deactivation / block-mute 等) の導線ハブとして本実装する。「アカウント設定」「セッション情報」「ブロック/ミュート (準備中)」「表示設定」の 4 セクション構成にし、既存の Color/Shape 選択 UI は「表示設定」セクションに移動する。

## Why

Settings 画面は現在 Color/Shape カードのみのプレースホルダー。intent ツリーで優先度「高」と整理された settings-hub feature の最初の slice であり、後続の account-deactivation (危険領域への導線) と block-mute (一覧セクション) がこのハブ構造を前提にするため、先にレイアウトを確定させる。

## Scope

- `src/App/View/Settings.purs` のビュー書き換え
  - セクション構成: アカウント設定 / セッション情報 / ブロック・ミュート (準備中の placeholder) / 表示設定
  - Color/Shape カードは表示設定セクションに移動。**`data-color-option` / `data-shape-option` 属性と `id` は維持する** (テーマ切替の JS フックが依存している可能性があるため)
  - セッション情報セクション: `Model.session` の username 表示 + ログアウトボタン (`Logout` message 発行、`src/App/View/Layout.purs` のログアウトボタンと同じ Message)
  - アカウント設定セクション: `App.View.Link.link` でアカウント一覧 (`Home` または相当の Route) への導線
- `src/App/View.purs` のディスパッチ変更
  - 現在 `Settings -> Settings.view` だが、セッション表示のため `Settings.view model` (または `model.session`) を渡す形に変更する
- `App.Model` / `App.Message` の変更は**原則不要** (既存の `session :: Maybe SessionInfo` と `Logout` message で足りる)。必要になった場合は最小限にとどめる

## Out of scope

- ブロック/ミュート一覧の実データ表示 (block-mute feature の packet。今回は「準備中」placeholder のみ)
- アカウント削除 (危険領域) UI (account-deactivation feature の packet)
- 新規 Route の追加
- BFF / GraphQL スキーマの変更 (本 packet は PureScript フロントのみ)
- テーマ切替ロジック自体の変更

## Verification

- `spago build` が成功すること
- `./scripts/dev.sh mock` で起動し、以下を手動確認:
  - `/settings` に 4 セクションが表示される
  - mock ログイン (任意メール + `password`) 後、セッション情報セクションに username が表示される
  - ログアウトボタンでログイン画面へ遷移する
  - アカウント設定セクションのリンクが SPA 遷移する (フルリロードしない)
  - `/settings` を直接リロードしても同じ見た目 (SSR + ハイドレーションが壊れていない)
  - Color/Shape カードのクリックが従来通り動作する
- `git diff --check` で空白エラーがないこと

## Knowledge Maintenance (G461, optional)

- Intent placement: `intents/ratcap/features/settings-hub/overview.md` が primary。新規ノード不要
- ADR candidate: なし (既存アーキテクチャの踏襲のみ)
- Diagram candidate: なし
- Docs update: なし (README の画面説明は現状でも破綻していない)
- Closeout learning: セクション構成確定後、block-mute / account-deactivation の packets.md の導線記述を実態に合わせる (write_back_required: false、次 packet 起票時の確認事項)
