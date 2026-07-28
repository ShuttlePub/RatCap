# follow — requirements

> [overview.md](overview.md) を参照。

## Functional requirements

1. **GraphQL スキーマ拡張**
   - `bff/schema.graphql` に以下を追加する。
     ```graphql
     type FollowResult {
       followId: ID!
       remoteActorUrl: String!
       activityId: String!
       approved: Boolean!
     }

     type Mutation {
       ...existing
       followAccount(accountId: ID!, target: String!): FollowResult!
     }
     ```
   - `target` は nanoid、actor URL、`acct:user@domain` 形式の文字列を受け付ける。

2. **EmumetClient 契約拡張**
   - `bff/emumet/client.ts` の `EmumetClient` インターフェースに以下を追加する。
     ```typescript
     followAccount(accountId: string, target: string): Promise<FollowResult>;
     ```
   - `FollowResult` 型も `client.ts` に定義する（camelCase）。
   - `bff/emumet/real.ts` で `POST /api/v1/accounts/{accountId}/follow` を呼び出す。リクエストボディは `{ target: string }`、レスポンスは snake_case → camelCase 変換する。
   - `bff/emumet/mock.ts` は対象文字列を検証し、成功時に疑似 `follow_id`, `remote_actor_url`, `activity_id`, `approved` を返す。フォロー状態はインメモリで保持する（一覧実装時のため）。

3. **リゾルバ実装**
   - `bff/resolvers.ts` に `Mutation.followAccount` を実装する。
   - `requireEmumet` で未認証を防ぐ。
   - Emumet 側から 400/403/404 を返された場合は適切な `extensions.code` を設定する（400 → `BAD_USER_INPUT`、403/404 → `NOT_FOUND`、その他 → `INTERNAL_SERVER_ERROR`）。

4. **PureScript 型再生成**
   - `bun scripts/sync-graphql.ts` を実行する。
   - `spago build` でコンパイルエラーを解消する。

5. **UI 実装**
   - `src/App/View/AccountDetail.purs` に「フォロー」セクションを追加する。
   - テキスト入力欄にプレースホルダー「@user@domain または actor URL または nanoid」を表示する。
   - 「フォロー」ボタンを押すと mutation を発行する。
   - 成功時は `FollowResult` の `remoteActorUrl`, `activityId`, `approved` を簡潔に表示する（`followId` は詳細表示/将来用）。
   - 失敗時は `App.Message` のエラーハンドリングを流用してメッセージを表示する。

6. **状態管理**
   - `src/App/Model.purs` にフォロー対象入力文字列と、フォロー結果/エラーの一時状態を追加する。
   - `src/App/Message.purs` に `SetFollowTarget String` / `SubmitFollow String` / `FollowSucceeded String FollowResult` / `FollowFailed String String` などを追加する（命名は実装時に調整）。

## Non-functional requirements

- **認可**: `account_sign` 権限（Owner/Editor/Signer）を持つアカウントのみフォロー操作を許可する。権限判定は Emumet 側に委ね、BFF はレスポンスをそのまま写像する。
- **入力検証**: フロントエンドでは空文字列送信を防ぐ。BFF/Emumet 側での詳細な形式検証結果は 400/403/404 として返す。
- **テスト**: `bff/*.test.ts` に成功ケース、未認証、存在しないアカウント、無効な target、権限不足のテストを追加する。
- **SSR 整合性**: フォローフォームは SSR 時にも静的に表示してよい。mutation はクライアント側でのみ発行する。
- **パフォーマンス**: フォロー API は同期/準同期呼び出しの可能性があるため、ボタンは実行中 disabled とする。タイムアウトは既存の `Affjax` 設定に従う。
- **将来的な拡張**: フォロー/フォロワー一覧は初回 slice では実装せず、ActivityPub collections 対応時に追加する。
