# follow — design decisions

> [overview.md](overview.md) を参照。 cross-domain ADR は [../../decisions/](../../decisions/) を参照。

## Decisions

1. **BFF GraphQL スキーマに専用の `FollowResult` 型を追加する**
   - Emumet REST のレスポンス `{ follow_id, remote_actor_url, activity_id, approved }` をそのまま camelCase の `FollowResult` として表現する。
   - フロントエンドは mutation 結果を `App.Api.GraphQL.Types` に独自 DTO としてデコードする（生成型への依存を減らす）。

2. **EmumetClient 抽象に `followAccount` を追加する**
   - `bff/emumet/client.ts` に `FollowResult` 型と `followAccount` メソッドを追加し、`real.ts` / `mock.ts` で同一契約を実装する。
   - REST 呼び出しは `POST /api/v1/accounts/{accountId}/follow`、ボディ `{ target }`、Bearer トークン付与。

3. **フォロー UI はアカウント詳細画面に配置する**
   - 現状のアカウント詳細 (`src/App/View/AccountDetail.purs`) にフォローセクションを追加する。
   - 将来的に設定ハブや専用ページに移動してもよいが、初回 slice では詳細画面に配置して実装コストを抑える。

4. **フォロー/フォロワー一覧は初回 slice では実装しない**
   - 一覧取得は ActivityPub collections（inbox/outbox/followers/following）に依存するため、本機能の初回実装ではスコープ外とする。
   - `FollowResult` に `followId` を含めることで、将来的な一覧/取消し実装に備える。

5. **エラーハンドリングは既存パターンに従う**
   - 未認証は `UNAUTHENTICATED`、アカウントまたは target 不在/権限不足は `NOT_FOUND`、無効な入力は `BAD_USER_INPUT`、その他は `INTERNAL_SERVER_ERROR`。
   - フロントエンドでは `extensions.code` を解釈して 401 時はログインへ、404 時は「アカウントまたは対象アクターが見つかりません」等を表示する。

6. **権限判定は Emumet 側に委ねる**
   - `account_sign`（Owner/Editor/Signer）の判定は Emumet で行う。BFF はレスポンスの status code を適切な GraphQL エラーコードに写像するのみ。
