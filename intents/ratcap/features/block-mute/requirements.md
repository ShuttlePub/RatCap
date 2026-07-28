# block-mute — requirements

> 目的は [overview.md](overview.md) を参照。

## Functional requirements

- **ブロックの追加**
  - 認証済みユーザーは `POST /api/v1/accounts/{account_id}/block` を通じて、指定した `target` をブロックできる。
  - `target` はローカル nanoid、リモート actor URL、`acct:user@domain` のいずれかを受け入れる。
  - 成功時は GraphQL 上で `true` を返す。

- **ブロックの解除**
  - 認証済みユーザーは `POST /api/v1/accounts/{account_id}/unblock` を通じてブロックを解除できる。
  - 成功時は GraphQL 上で `true` を返す。

- **ブロック一覧の取得**
  - 認証済みユーザーは `GET /api/v1/accounts/{account_id}/blocks` を通じてブロック済み対象の一覧を取得できる。
  - 一覧には各ブロックの `id`、 `target_type`、 `target` が含まれる。

- **ミュートの追加**
  - 認証済みユーザーは `POST /api/v1/accounts/{account_id}/mute` を通じて `target` をミュートできる。
  - `target` の形式はブロックと同じ。
  - 成功時は GraphQL 上で `true` を返す。

- **ミュートの解除**
  - 認証済みユーザーは `POST /api/v1/accounts/{account_id}/unmute` を通じてミュートを解除できる。
  - 成功時は GraphQL 上で `true` を返す。

- **ミュート一覧の取得**
  - 認証済みユーザーは `GET /api/v1/accounts/{account_id}/mutes` を通じてミュート済み対象の一覧を取得できる。
  - 一覧には各ミュートの `id`、 `target_type`、 `target` が含まれる。

- **UI 操作**
  - アカウント詳細画面 (`/accounts/{id}`) にブロック / ミュートボタンを配置する。
  - 操作後は一覧または状態表示を即座に更新する。
  - 解除操作は確認ダイアログまたはボタン切り替えで行う。

## Non-functional requirements

- **認証・認可**
  - 未認証リクエストは BFF リゾルバで `UNAUTHENTICATED` エラーとする。
  - 所有権限 (`account_sign = Owner/Editor/Signer`) は Emumet 側で検証し、BFF は Bearer token をそのまま転送する。

- **パフォーマンス**
  - 一覧取得は 1 リクエストで完結し、ページネーションは初回は行わない（`items` 全件を返す）。

- **セキュリティ**
  - `target` 入力値はクライアント側で軽微な空白トリムを行うが、実際の検証は Emumet に委ねる。
  - 状態変更操作は GraphQL mutation 経由とし、CSRF 保護は既存の `/graphql` エンドポイントの Origin/Referer チェックに依存する。

- **信頼性**
  - ブロック / ミュート API が Emumet 側で 403 / 404 を返した場合、BFF は `INTERNAL_SERVER_ERROR` または `NOT_FOUND` に写像する（現行の `withEmumetErrors` パターンに従う）。
