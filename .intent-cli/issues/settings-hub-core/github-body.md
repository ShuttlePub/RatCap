## Goal

Settings 画面 (`/settings`) をプレースホルダーから設定ハブとして本実装する。アカウント設定 / セッション情報 / ブロック・ミュート (準備中) / 表示設定の 4 セクション構成にし、既存の Color/Shape 選択 UI は表示設定セクションに移動する。

## Why This Slice Exists Now

Settings 画面は現状 Color/Shape カードのみのプレースホルダー。後続の account-deactivation (危険領域への導線) と block-mute (ブロック/ミュート一覧セクション) がこのハブ構造を前提とするため、先に情報アーキテクチャを確定させる。intent 整理 (`intents/ratcap/intent-tree/00-map.md`) で優先度「高」の最初の slice。

## Current Observed State

`src/App/View/Settings.purs` は `view :: Html Message` で Model を受け取らず、Color と Shape の 2 セクションのみを表示する。`src/App/View.purs` は `Settings -> Settings.view` とディスパッチしている。セッション情報 (`Model.session`) やアカウント導線は表示されていない。

## Accepted Baseline You May Assume

- PureScript + Flame (Elm アーキテクチャ)、SSR + クライアントハイドレーション構成を維持する
- Tailwind CSS v4。テーマクラスは `src/App/Theme.purs` のヘルパー (`T.surface`, `T.textHeading` 等) を使う
- SPA 内リンクは `src/App/View/Link.purs` の `link :: Route -> Array (Html Message) -> Html Message` を使う (`Navigate` message を発行)
- セッション情報は `Model.session :: Maybe SessionInfo`、ログアウトは `Logout` message (`src/App/Message.purs`)。`src/App/View/Layout.purs` にログアウトボタンの既存実装例がある
- Route 定義は `src/App/Route.purs` (本 issue では変更不要)

## Target Repo / Path / Part

Repository: `ShuttlePub/Ratcap`

Target paths: `src/App/View/Settings.purs`, `src/App/View.purs`

Target part: Settings ページのビューとディスパッチ (Model 受け渡しを含む)

## In Scope

- `Settings.purs` のビューを 4 セクション構成に書き換え
- Color/Shape カードを表示設定セクションに移動 (`data-color-option` / `data-shape-option` 属性と `id` は維持)
- セッション情報セクションに username 表示 + ログアウトボタン (`Logout` message)
- アカウント設定セクションに `App.View.Link` によるアカウント一覧への導線
- ブロック/ミュートセクションは「準備中」の placeholder テキストのみ
- `View.purs` のディスパッチを `Settings.view` に Model (または `model.session`) を渡す形に変更

## Out Of Scope

- ブロック/ミュート一覧の実データ表示 (別 feature: block-mute)
- アカウント削除 UI (別 feature: account-deactivation)
- 新規 Route 追加、BFF / GraphQL 変更、`Model` / `Message` への新規コンストラクタ追加 (原則不要)
- テーマ切替ロジック自体の変更

## Standalone Child Issue Contract

`/settings` を 4 セクション (アカウント設定 / セッション情報 / ブロック・ミュート準備中 / 表示設定) のハブ画面に作り替える。セッション情報にはログイン中 username とログアウトボタンを表示し、アカウント設定にはアカウント一覧への SPA リンクを置く。既存の Color/Shape カードは属性・動作を維持したまま表示設定セクションへ移動する。`spago build` が通り、SSR 直接アクセスとクライアント遷移の両方で正しく描画されること。変更ファイルは `src/App/View/Settings.purs` と `src/App/View.purs` に限定する。

## Acceptance Criteria

- [ ] `/settings` に 4 セクションが表示される
- [ ] Color/Shape カードが表示設定セクション内にあり、`data-color-option` / `data-shape-option` 属性が維持され、クリック動作が従来通り
- [ ] セッション情報セクションにログイン中の username とログアウトボタンが表示され、ログアウトが動作する
- [ ] アカウント設定セクションのリンクが SPA 遷移する (フルリロードしない)
- [ ] `spago build` が成功する
- [ ] `/settings` 直接リロード (SSR) とクライアント遷移で見た目が一致する

## Verification

- `spago build`
- `./scripts/dev.sh mock` で手動 QA (上記 Acceptance Criteria をブラウザで確認。mock ログイン: 任意メール + `password`)
- `git diff --check`

## Related Links

- Intent: `intents/ratcap/features/settings-hub/` (overview / requirements / acceptance / packets)
- Intent map: `intents/ratcap/intent-tree/00-map.md`
- 後続 feature: `intents/ratcap/features/account-deactivation/`, `intents/ratcap/features/block-mute/`

## Knowledge Maintenance

- Intent placement: `intents/ratcap/features/settings-hub/overview.md` (primary) / 新規ノード不要
- ADR candidate: none
- Diagram candidate: none
- Docs update: none
- Closeout writeback expected: no (次 packet 起票時に block-mute / account-deactivation の導線記述を実態に合わせる)

## Base Branch Policy

Policy: `direct-main`
Expected PR base branch: `main`

Open all child PRs against `main` directly.
