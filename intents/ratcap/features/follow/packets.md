# follow — packets

> [../../packets/](../../packets/) に domain-level packet がある場合は参照。

## Execution units

### Packet 1: BFF GraphQL + EmumetClient 拡張
- **対象ファイル**: `bff/schema.graphql`, `bff/emumet/client.ts`, `bff/emumet/real.ts`, `bff/emumet/mock.ts`, `bff/resolvers.ts`
- **作業内容**:
  1. `bff/schema.graphql` に `FollowResult` 型と `followAccount(accountId: ID!, target: String!): FollowResult!` mutation を追加する。
  2. `bff/emumet/client.ts` に `FollowResult` 型と `followAccount` メソッドを追加する。
  3. `bff/emumet/real.ts` で `POST /api/v1/accounts/{accountId}/follow` を呼び出し、レスポンスを camelCase に変換する。
  4. `bff/emumet/mock.ts` で `followAccount` を実装し、フォロー状態をインメモリで保持する。
  5. `bff/resolvers.ts` に `Mutation.followAccount` を追加する。
  6. `bff/*.test.ts` に成功/未認証/404/無効入力/権限不足のテストを追加する。
- **完了条件**: `bun test` が全て通る。

### Packet 2: PureScript 型再生成 + フロントエンド API 呼び出し
- **対象ファイル**: `src/Generated/**/*.purs`, `src/App/Api/GraphQL.purs`, `src/App/Api/GraphQL/Types.purs`
- **作業内容**:
  1. `bun scripts/sync-graphql.ts` を実行して生成型を更新する。
  2. `src/App/Api/GraphQL/Types.purs` に `FollowResultResponse` 型を追加する。
  3. `src/App/Api/GraphQL.purs` に `followAccount :: String -> String -> Aff (Either ApiError FollowResultResponse)` を追加する。
  4. `spago build` でコンパイルエラーを解消する。
- **完了条件**: `spago build` が成功する。

### Packet 3: UI フォローセクション + 状態管理
- **対象ファイル**: `src/App/Model.purs`, `src/App/Message.purs`, `src/App/View/AccountDetail.purs`, `src/Client/Update.purs`（または一元 Update ファイル）
- **作業内容**:
  1. `src/App/Message.purs` にフォロー関連メッセージを追加する。
  2. `src/App/Model.purs` にフォロー対象入力文字列と結果/エラー状態を追加する。
  3. `src/App/View/AccountDetail.purs` にフォロー入力欄と実行ボタン、結果表示エリアを追加する。
  4. update 関数にフォロー mutation 実行と成功/失敗ハンドラを追加する。
  5. mock モードで手動検証する（アカウント作成 → フォロー実行 → 結果表示）。
- **完了条件**: 手動でフォローが実行でき、結果が表示される。
