# admin-moderation — packets

> ドメイン全体のパケット一覧は [../../packets/](../../packets/) を参照。

## Execution units

### Packet 1: BFF admin mutation 層と認可

- **対象ファイル**
  - `bff/schema.graphql`
  - `bff/emumet/client.ts`
  - `bff/emumet/real.ts`
  - `bff/emumet/mock.ts`
  - `bff/context.ts`
  - `bff/resolvers.ts`
  - 新規または既存の BFF テストファイル

- **作業内容**
  - `bff/schema.graphql` に `suspendAccount` / `unsuspendAccount` / `banAccount` mutation を追加する。
  - `EmumetClient` インターフェースに 3 メソッドを追加する。
  - `real.ts` で Emumet の admin REST エンドポイントを呼び出し、 snake_case ↔ camelCase 変換を実装する。
  - `mock.ts` に停止 / BAN 状態を保持するストアを追加し、 `getAccount` の結果に `moderation` が反映されるようにする。
  - `bff/context.ts` に admin role フラグを持たせる（実装方針は open-questions.md 解決後）。
  - `bff/resolvers.ts` に `requireAdmin` ガードと 3 つの admin-only mutation リゾルバを追加する。
  - BFF テストに admin / 非 admin 両方のケースを追加する。

- **完了条件**
  - `bun test` が既存テストを含めて全て通る。
  - `bff/schema.graphql` の変更後、 `bun scripts/sync-graphql.ts` がエラーなく実行できる。

### Packet 2: PureScript 側の admin 情報と GraphQL API

- **対象ファイル**
  - `src/App/Api/Auth.purs`（または `src/App/Api/Client.purs`）
  - `src/App/Api/GraphQL.purs`
  - `src/App/Message.purs`
  - `src/App/Model.purs`
  - `src/Client/Update.purs`
  - `src/Generated/`（再生成）

- **作業内容**
  - `GET /auth/session` レスポンスに admin フラグを追加する場合、 `SessionResponse` デコーダと `SessionInfo` 型を改修する。
  - `bun scripts/sync-graphql.ts` を実行して生成型を更新する。
  - `GraphQL.purs` に `suspendAccount` / `unsuspendAccount` / `banAccount` 関数を追加する。
  - `Message.purs` に管理操作の Message を追加する。
  - `Model.purs` の `SessionInfo` に `isAdmin` フラグを追加する（open-questions.md 解決後）。
  - `Update.purs` に各 Message ハンドラを追加し、成功後に `FetchAccountDetail` を発行する。

- **完了条件**
  - `spago build` が成功する。
  - 新しい GraphQL 関数と admin フラグが型検査を通る。

### Packet 3: UI モデレーション表示と admin 操作フォーム

- **対象ファイル**
  - `src/App/View/AccountDetail.purs`
  - `src/App/View/Layout.purs`（必要に応じて admin ナビゲーション追加）
  - `src/App/Theme.purs`（バッジ・警告色クラス）
  - `src/App/Format.purs`（日時フォーマットは既存を利用）

- **作業内容**
  - アカウント詳細画面に `AccountResponse.moderation` の内容を表示するバッジセクションを追加する。
  - 停止中は理由と有効期限を、BAN 中は理由と適用日時を表示する。
  - admin セッション時のみ、停止フォーム（理由 + 任意期限）、停止解除ボタン、BAN フォーム（理由 + 強力確認）を表示する。
  - BAN 確認ダイアログでアカウント名を入力させ、一致した場合のみ操作を発行する。
  - 操作実行中は `savePending` フラグを利用してボタンを disabled にする。

- **完了条件**
  - `spago build` と `spago test` が成功する。
  - `./scripts/dev.sh mock` 起動後、 admin 権限を持つ mock ユーザーで停止 / 停止解除 / BAN の一連の操作がブラウザで確認できる。