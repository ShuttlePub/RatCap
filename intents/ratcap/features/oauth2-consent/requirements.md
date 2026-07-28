# oauth2-consent — requirements

> See [overview.md](overview.md) for goals.

## Functional requirements

- FR1: ユーザーが OAuth2 認可フロー中に `GET /oauth2/consent?consent_challenge=...` へ到達した際、Hydra から `action: "show_consent"` レスポンスが返れば、同意画面を表示する。
- FR2: 同意画面には `client_name` と `requested_scope` の一覧を読みやすい形式で表示する。
- FR3: ユーザーが「許可」を選択すると、`POST /oauth2/consent` へ `{ consent_challenge, accept: true, grant_scope: requested_scope }` を送信する。
- FR4: ユーザーが「拒否」を選択すると、`POST /oauth2/consent` へ `{ consent_challenge, accept: false }` を送信する。`grant_scope` は含めない。
- FR5: `POST /oauth2/consent` から返る 302 レスポンスの `Location` ヘッダーに従ってブラウザをリダイレクトする。
- FR6: `GET /oauth2/consent` がすでに 302 を返す場合（auto-skip 時）は、特に HTML を生成せずそのままリダイレクトを伝搬する。
- FR7: 未ログイン状態や無効な `consent_challenge` の場合、エラーメッセージを表示するか安全なリダイレクトを行う。
- FR8: セッション状態は既存の `ratcap_session` cookie または Hydra 側のセッションから解決する（新たな独自セッション機構は作らない）。

## Non-functional requirements

- NFR1: 本機能は real 認証モード（Kratos + Hydra）でのみ必要。mock モードでは無効でよい。
- NFR2: 同意ページは SEO や SPA ハイドレーションを重視しない。必要であれば軽量な SSR またはフォーム送信で済ます。
- NFR3: 同意画面はシンプルかつアクセシビリティを意識したマークアップにする。
- NFR4: セキュリティ： consent_challenge は URL クエリパラメータとして扱われるが、HTML 内に hidden フィールドまたは安全に保持して送信する。
- NFR5: CSRF 対策：同意/拒否は POST で行う。Hydra が PKCE フローを担保しているため、Ratcap 側は追加の CSRF トークンを必要としないが、セッション Cookie は `SameSite=Lax` / `HttpOnly` など既存設定を維持する。
- NFR6: エラーハンドリング：Emumet または Hydra から予期しないレスポンスが返った場合、ユーザーに分かりやすいエラー画面を表示し、サーバーログに残す。
- NFR7: 既存の `/auth/*` エンドポイントと OAuth2 callback フローに影響を与えない。
- NFR8: テスト：real モードの手動 E2E テストを実施する。BFF 単体テストが可能であれば mock 化して追加する。
