# admin-moderation — design decisions

> 目的は [overview.md](overview.md) を参照。ドメイン横断の ADR は [../../decisions/](../../decisions/) を参照。

## Decisions

- **GraphQL スキーマの再利用**
  - `Account.moderation` フィールドと `Moderation` / `ModerationType` 型は既存の `bff/schema.graphql` のものをそのまま利用する。
  - 新規追加は `suspendAccount` / `unsuspendAccount` / `banAccount` の 3 mutation のみとする。

- **BFF 認可設計**
  - admin 判定は BFF コンテキストで行う。 `GraphQLContext` に `isAdmin: boolean` のようなフラグを追加するか、 `SessionInfo` 相当の情報を context に注入する。
  - リゾルバは `requireAdmin(context)` ヘルパーを呼び出し、非 admin 時は `GraphQLError("Forbidden", { extensions: { code: "FORBIDDEN" } })` を投げる。
  - Mock モードでは固定の admin ユーザー名（例: `admin@example.com`）または特定の username を admin として扱う。実装時に `open-questions.md` の解決に従う。

- **ロール解決の正源 (2026-07-28 方針決定・実装待ち)**
  - ロール / 権限の正源は Keto とし、 **Emumet にセッションコンテキスト解決エンドポイントを新設** する (現在 Emumet 側で実装中)。Ratcap が権限モデルを二重に持たない分離とする。
  - Ratcap (BFF) 側は同エンドポイントの結果を **TTL キャッシュ** する。管理操作は低頻度のため短めの TTL (30〜60 秒程度) を想定。
  - **本 feature は Emumet 側エンドポイントの実装完了まで blocked。** 完了後に BFF context への組み込みと `SessionInfo` への admin フラグ露出を行う。

- **EmumetClient 契約**
  - `suspendAccount(id, reason, expiresAt)` は `expiresAt` を ISO 8601 文字列または `null` で受け取り、 `POST /api/v1/admin/accounts/{id}/suspend` の body `{ reason, expires_at }` に変換する。
  - `unsuspendAccount(id)` と `banAccount(id, reason)` は 204 成功を期待する。

- **UI 配置方針（初期）**
  - 管理操作はアカウント詳細画面 (`src/App/View/AccountDetail.purs`) に「Admin」セクションとして配置する。
  - 別途 `/admin` ルートを作るかどうかは [open-questions.md](open-questions.md) の解決後に決定する。

- **状態反映方式**
  - 管理 mutation 成功後は `FetchAccountDetail` を発行して詳細を再フェッチし、 `Account.moderation` の更新を反映する。
  - 停止解除成功後は `moderation` が `null` になり、バッジが非表示になる。

- **確認ダイアログ**
  - BAN 操作は確認モーダル内でアカウント名 (`@name`) を入力させ、一致する場合のみ `BanAccount` Message を発行する。
  - 停止操作は理由入力のみ必須とし、期限は任意の datetime-local 入力とする。
  - 停止解除はボタン単発で実行するが、理由入力欄が空でない場合は確認メッセージを表示する（簡易ガード）。