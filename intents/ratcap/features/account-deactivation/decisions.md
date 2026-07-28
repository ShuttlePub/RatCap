# account-deactivation — design decisions

> [overview.md](overview.md) を参照。 cross-domain ADR は [../../decisions/](../../decisions/) を参照。

## Decisions

1. **BFF GraphQL スキーマを拡張する**
   - フロントエンドから直接 Emumet REST を呼ばず、必ず `bff/schema.graphql` に `deleteAccount(id: ID!): Boolean!` mutation を追加して BFF 経由とする。
   - これにより、認証・認可・エラーハンドリングを BFF 側で一元管理できる。

2. **EmumetClient 抽象にメソッドを追加する**
   - `bff/emumet/client.ts` の `EmumetClient` インターフェースに `deleteAccount(id: string): Promise<void>` を追加し、`real.ts` / `mock.ts` の両方で同一契約を実装する。
   - 既存の `deleteMetadata` と同じく、リゾルバは `void` 返却を `true` に変換する。

3. **SSR + クライアントハイドレーションを維持する**
   - サーバー側のレンダリングでは削除ボタンを表示しないか disabled にし、Flame の `resumeMount` 後のクライアント側でイベントハンドラを有効化する方針とする。
   - 初期実装では、削除フォームの初期状態はサーバー側 HTML に含めず、クライアントマウント後に動的に出す（または単にクリックでダイアログを開く）。

4. **確認ダイアログでアカウント名入力を求める**
   - 破壊的操作を防ぐため、ボタン活性化の条件に「入力値 == アカウント名」を設ける。
   - 入力欄は `App.Model` に専用フィールドを持ち、`Message` で更新する。

5. **削除成功後は Navigate Home で一覧へ遷移する**
   - `Message` に `Navigate Home` を発行し、`routing` + `PushStateInterface` によるクライアントサイド遷移を行う。
   - 同時に `FetchAccounts` を発行して最新一覧を取得する。

6. **エラーハンドリングは既存パターンに従う**
   - 未認証は `UNAUTHENTICATED`、Emumet 404/所有権違反は `NOT_FOUND` / 専用メッセージ、それ以外は `INTERNAL_SERVER_ERROR` とする。
   - フロントエンドでは `extensions.code` を解釈して 401 時はログインへ、404 時は「削除する権限がありませんまたは既に削除されています」といったメッセージを表示する。
