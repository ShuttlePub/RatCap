---
---

# settings-hub — overview

> 関連: [requirements.md](requirements.md) / [acceptance.md](acceptance.md) / [decisions.md](decisions.md) / [open-questions.md](open-questions.md) / [packets.md](packets.md)

## Goals

- `/settings` ルートを Ratcap の設定ハブとして再構成する。
- 現在 `src/App/View/Settings.purs` はテーマ/形状選択の placeholder のみなので、実用的な設定メニューに置き換える。
- 設定ハブからアカウント設定（アカウント詳細へ）、セッション情報、ブロック/ミュート管理（将来機能）、表示設定 placeholder への導線を提供する。
- 初回 slice では新規バックエンドエンドポイントは不要。主にフロントエンドの情報設計とナビゲーションを整理する。

## Acceptance criteria summary

- `src/App/View/Settings.purs` が設定ハブレイアウトに書き換えられる。
- 設定ハブに「アカウント設定」「セッション情報」「ブロック/ミュート（将来）」「表示設定（placeholder）」セクションが配置される。
- アカウント設定セクションから各アカウントの詳細画面 (`/accounts/{id}`) へ遷移できる。
- セッション情報セクションに現在ログイン中のユーザー名（`GET /auth/session` 取得済み）を表示する。
- ブロック/ミュートセクションは将来実装のため placeholder 表示とする。
- 表示設定セクションは現在のテーマ/形状選択を維持し、将来の拡張に備える。
- `spago build` が成功する。
