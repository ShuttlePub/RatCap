# admin-moderation — requirements

> 目的は [overview.md](overview.md) を参照。

## Functional requirements

- **アカウント停止（suspend）**
  - admin role を持つユーザーは `POST /api/v1/admin/accounts/{id}/suspend` を通じてアカウントを停止できる。
  - 停止理由 (`reason`) は必須とする。
  - 有効期限 (`expires_at`) は任意とし、指定しない場合は無期限の停止とする。
  - 成功時は GraphQL 上で `true` を返す。

- **アカウント停止解除（unsuspend）**
  - admin role を持つユーザーは `POST /api/v1/admin/accounts/{id}/unsuspend` を通じて停止中のアカウントを解除できる。
  - 成功時は GraphQL 上で `true` を返す。

- **アカウント BAN（ban）**
  - admin role を持つユーザーは `POST /api/v1/admin/accounts/{id}/ban` を通じてアカウントを BAN できる。
  - BAN 理由 (`reason`) は必須とする。
  - 成功時は GraphQL 上で `true` を返す。
  - BAN は不可逆な操作として扱い、UI 上で強力な確認を挟む。

- **モデレーション状態の表示**
  - アカウント詳細画面 (`/accounts/{id}`) では、 `account.moderation` が存在する場合にその種別と理由、適用日時、有効期限を表示する。
  - 停止中の場合は 「Suspended」 バッジ、 BAN の場合は 「Banned」 バッジを表示する。

- **admin UI の表示条件**
  - 停止 / 停止解除 / BAN フォームは、現在のセッションが admin role を持つ場合のみ表示する。
  - admin 状態は `SessionInfo` または BFF GraphQL コンテキストを通じて取得する。

## Non-functional requirements

- **認証・認可**
  - 未認証リクエストは `UNAUTHENTICATED` エラーとする。
  - 認証済みだが admin role を持たないリクエストは `FORBIDDEN` エラーとする。
  - 実際の権限は Emumet 側の `instance_moderate` permission で検証されるが、BFF でも role フラグをチェックして早期失敗する。

- **セキュリティ**
  - 管理用 mutation は POST リクエストを伴うため、GraphQL エンドポイントに対する Origin/Referer チェックが既存の CSRF 保護として機能する。
  - BAN 操作は確認ダイアログでアカウント名を入力させるなど、誤操作防止策を講じる。

- **エラー写像**
  - Emumet から 403 が返された場合は BFF 側で `FORBIDDEN` エラーコードを返すか、 `INTERNAL_SERVER_ERROR` に吸収する。
  - 対象アカウントが存在しない場合は Emumet 側の 404 を `NOT_FOUND` として返す。

- **監査・ロギング**
  - 管理操作の成否は Emumet 側で記録されることを想定する。BFF レイヤーでは成功時に簡潔なログを出力する。