# oauth2-consent — packets

> See [../../packets/](../../packets/) for domain-level packet list.

## Execution units

### Packet 1: 実装方針決定と BFF エンドポイント設計

- 内容
  - `open-questions.md` の Q1, Q2, Q3 をクローズし、`decisions.md` に記録する。
  - `index.ts` に `/oauth2/consent` ルートを追加するかどうか、受け渡し方を決める。
  - Emumet の `GET /oauth2/consent` を BFF 経由または直接プロキシして、HTML 生成に必要な情報（`client_name`, `requested_scope`, `consent_challenge`）を取得する。
  - 同意ページ用のテンプレートまたは SSR コンポーネントを設計する。必要に応じて `Server.purs` 側に新しいレンダリング関数を追加するか、`index.ts` 内で軽量 HTML を返す。
- 完了条件
  - `decisions.md` に実装方針が確定して記録される。
  - `GET /oauth2/consent?consent_challenge=...` で同意ページが表示される（または 302 が伝搬される）。
- 推定規模：中
- 依存：なし（ただし open questions の解決が必要）

### Packet 2: 同意/拒否 POST 処理とエラーハンドリング・テスト

- 内容
  - 同意ページのフォームから `POST /oauth2/consent` へ `consent_challenge`, `accept`, `grant_scope` を送信する。
  - Emumet または Hydra から返る 302 リダイレクトをブラウザへ伝搬する。SSR 経由の場合はサーバー側リダイレクト、フォーム直接送信の場合はブラウザが自動で追従する。
  - エラーハンドリング：無効な `consent_challenge`、未ログイン、Hydra エラー時の表示を実装する。
  - `accept: false`（拒否）時の遷移先を確認し、必要ならエラー/キャンセルページを追加する。
  - real モードで手動 consent フローを有効化し、E2E テストを行う。BFF 単体テストが可能な範囲は追加する。
- 完了条件
  - 「許可」「拒否」いずれも正常に OAuth2 フローを完了または安全に中断する。
  - AC5 ~ AC11 が満たされる。
- 推定規模：中
- 依存：Packet 1 完了後

## Ordering

1. Packet 1: open questions を解決し、BFF/SSR エンドポイントと同意ページ表示を実装する。
2. Packet 2: POST 処理、エラーハンドリング、 real モード E2E テストを実装する。
