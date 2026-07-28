# account-deactivation — requirements

> [overview.md](overview.md) を参照。

## Functional requirements

1. **GraphQL スキーマ拡張**
   - `bff/schema.graphql` の `Mutation` 型に `deleteAccount(id: ID!): Boolean!` を追加する。
   - 入力 `id` は対象アカウントの Emumet account ID 文字列とする。
   - 戻り値は削除が成功した場合 `true`、失敗した場合は GraphQL エラーを返す。

2. **EmumetClient 契約拡張**
   - `bff/emumet/client.ts` の `EmumetClient` インターフェースに `deleteAccount(id: string): Promise<void>` を追加する。
   - 実装は `bff/emumet/real.ts` と `bff/emumet/mock.ts` の両方に行う。
   - `real.ts` では `DELETE /api/v1/accounts/{id}` を呼び出し、Bearer トークンを付与する。204 No Content を成功とする。
   - `mock.ts` ではインメモリの `accounts` 配列から対象を削除し、紐づく `profiles` / `metadata` もカスケード削除する。

3. **リゾルバ実装**
   - `bff/resolvers.ts` に `Mutation.deleteAccount` を実装する。
   - 未認証なら `requireEmumet` で `UNAUTHENTICATED` エラーを返す。
   - 成功時は `true`、失敗時は既存の `withEmumetErrors` / `toGraphQLError` 写像を経由してエラーを返す。

4. **PureScript 型再生成**
   - `bun scripts/sync-graphql.ts` を実行し、`src/Generated/` 配下の型を再生成する。
   - 生成後に `spago build` が成功する。

5. **UI 実装**
   - `src/App/View/AccountDetail.purs` の下部に「危険領域 (Danger Zone)」セクションを追加する。
   - セクション内に「アカウントを削除」ボタンを配置し、クリックで確認ダイアログを開く。
   - 確認ダイアログでは「削除を確認するにはアカウント名 `{name}` を入力してください」と表示し、入力値がアカウント名と一致した場合のみ削除ボタンを有効化する。
   - 削除実行中は削除ボタンを無効化し、ローディング状態を示す。
   - 削除成功後は `Navigate Home` を発行してアカウント一覧へ遷移する。

6. **状態管理**
   - `src/App/Message.purs` に `DeleteAccount String` / `DeleteAccountConfirmed String` / `AccountDeleted String` / `AccountDeleteFailed String String` などのメッセージを追加する（命名は実装時に調整）。
   - `src/App/Model.purs` に確認ダイアログの開閉状態と入力中の確認文字列を保持するフィールドを追加する。

## Non-functional requirements

- **セキュリティ**: 削除操作は BFF 経由で認証済みユーザーのみ実行可能とし、所有者チェックは Emumet 側に委ねる（204/403/404 を適切にハンドリング）。
- **UX**: 確認ダイアログの入力検証はクライアント側で行い、不一致時はエラーメッセージを即座に表示する。
- **テスト**: BFF リゾルバの成否ケース（認証あり成功、未認証、存在しない ID、所有権違反）を `bff/*.test.ts` でカバーする。
- **SSR 整合性**: サーバー側レンダリング時には削除ボタンを表示しないか、または非活性にし、クライアントハイドレーション後にイベントハンドラを有効化する。初期実装ではクライアント専用動作としてよい。
- **アクセシビリティ**: 確認ダイアログの入力欄には `label` / `aria-describedby` を付与し、フォーカストラップを検討する（実装フェーズで対応）。
