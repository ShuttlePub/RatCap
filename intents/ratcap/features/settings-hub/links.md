# settings-hub — links

> [overview.md](overview.md) を参照。

## Reference links

### ソースファイル
- `src/App/View/Settings.purs` — 設定ハブ画面（本機能の主要 UI）
- `src/App/View/AccountDetail.purs` — アカウント詳細画面（danger-zone / 削除 UI 実装先）
- `src/App/View/Accounts.purs` — アカウント一覧画面
- `src/App/View/Layout.purs` — ナビゲーションレイアウト（設定リンク追加先）
- `src/App/View/Link.purs` — SPA リンクコンポーネント
- `src/App/Model.purs` — Model 型（`accounts`、`session` 表示元）
- `src/App/Message.purs` — Message ADT（`Navigate`、`Logout`）
- `src/App/Route.purs` — ルーティング定義（`Settings`、`AccountDetail`）
- `src/Server.purs` — SSR エントリ（`Settings` ページレンダリング）
- `src/Client.purs` / `src/Client/Update.purs` — クライアントエントリと update 関数
- `bff/session.ts` — セッション基盤（`GET /auth/session` 取得の裏側）
- `bff/index.ts` / `bff/server.ts` — BFF エンドポイント

### Emumet バックエンドエンドポイント
- 本 slice では新規エンドポイントは不要。
- 将来のブロック/ミュート機能で参照する可能性があるエンドポイントは未定。

### 関連 intent ドキュメント
- `intents/ratcap/features/account-deactivation/` — 設定ハブから削除 danger-zone へ導線を貼る場合に参照
- `intents/ratcap/features/follow/` — 設定ハブからフォロー/フォロワー管理を行う場合に参照
