# settings-hub — design decisions

> [overview.md](overview.md) を参照。 cross-domain ADR は [../../decisions/](../../decisions/) を参照。

## Decisions

1. **Settings ページをハブとして再構成する**
   - 既存の `src/App/View/Settings.purs` はテーマ/形状選択の placeholder であるため、設定ハブとしての情報設計を整える。
   - 各設定カテゴリを独立したセクション/カードに分け、将来的なページ分割を見据えた構成とする。

2. **新規バックエンドエンドポイントは初回 slice では追加しない**
   - 設定ハブの初回実装は、既存データ（`Model.accounts`、`Model.session`）の表示とナビゲーションに限定する。
   - ブロック/ミュート一覧、アカウント削除専用ページ、詳細な表示設定は後続機能として切り出す。

3. **アカウント削除の導線は AccountDetail 側の danger-zone へ向ける**
   - 設定ハブから「アカウントを削除」のリンクを貼り、実際の削除 UI と確認ダイアログは `AccountDetail.purs` 側で一元管理する。
   - これにより、削除機能（account-deactivation）の実装箇所を分散させず、重複を避ける。

4. **SSR + クライアントハイドレーションを維持する**
   - `Settings` ページは `Server.purs` 経由で SSR される。サーバー側では `Model.session` が `Nothing` なので、未ログイン表示を前提とする。
   - クライアントマウント後の `CheckSession` で `Model.session` が更新され、ユーザー名が表示される。

5. **ナビゲーションは既存の `App.View.Link` / `Navigate` を使う**
   - 設定ハブ内のすべてのリンクは `App.View.Link` モジュールの SPA リンクまたは `App.Message.Navigate` を使用し、History API 遷移を維持する。

6. **ブロック/ミュートは placeholder として保留する**
   - Emumet 側のブロック/ミュートエンドポイントが確定するまで UI 導線のみを整備する。
   - 実装時に `intents/ratcap/features/block/` および `intents/ratcap/features/mute/` 等を新規作成する。
