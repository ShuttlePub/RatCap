# oauth2-consent — acceptance criteria

> See [overview.md](overview.md) for goals.

## Criteria

- [ ] AC1: 実装方針が決定し、本 intent の `decisions.md` に記録されている。候補は「Ratcap 内 standalone SSR ページ」または「Emumet / 他サービスでホスト」である。
- [ ] AC2: `GET /oauth2/consent?consent_challenge=...` へアクセスした際、Hydra レスポンスが `action: "show_consent"` の場合、HTML 同意ページが表示される。
- [ ] AC3: 同意ページには `client_name` と `requested_scope` の各要素が表示される。
- [ ] AC4: 同意ページの HTML 内に `consent_challenge` を保持（hidden フィールドまたはセッション対応）し、POST 時に正しく送信される。
- [ ] AC5: 「許可」ボタン押下で `POST /oauth2/consent` へ `accept: true` と `grant_scope` が送信され、返された 302 `Location` へリダイレクトされる。
- [ ] AC6: 「拒否」ボタン押下で `POST /oauth2/consent` へ `accept: false` が送信され、返された 302 `Location` へリダイレクトされる。
- [ ] AC7: `GET /oauth2/consent` が 302 を返す場合（auto-skip 時）、同意ページを生成せずに 302 リダイレクトをそのまま返す。
- [ ] AC8: `consent_challenge` が欠落または無効な場合、エラーメッセージを表示するか安全なリダイレクトを行う。
- [ ] AC9: 同意ページの実装が既存の `/auth/*` フローや `/auth/callback` に影響を与えない。
- [ ] AC10: real モードで Hydra の consent skip 設定を無効化し、手動同意フローが正常に完了することを E2E テストで確認する。
- [ ] AC11: 同意ページがアクセシビリティガイドライン（適切なラベル、ボタン、見出し）を満たすことを確認する。
