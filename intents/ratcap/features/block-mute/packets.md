# block-mute — packets

> ドメイン全体のパケット一覧は [../../packets/](../../packets/) を参照。

## Execution units

### Packet 1: BFF ブロック / ミュート層

- **対象ファイル**
  - `bff/schema.graphql`
  - `bff/emumet/client.ts`
  - `bff/emumet/real.ts`
  - `bff/emumet/mock.ts`
  - `bff/resolvers.ts`
  - 新規 `bff/resolvers.test.ts` または既存 BFF テストファイル

- **作業内容**
  - `Relation` 型、 `RelationConnection` 型、 6 つの GraphQL 操作を SDL に追加する。
  - `EmumetClient` インターフェースに 6 メソッドを追加する。
  - `real.ts` で Emumet REST エンドポイントを呼び出し、 snake_case ↔ camelCase 変換を実装する。
  - `mock.ts` にインメモリのブロック / ミュートストアを追加し、同一プロセス内で状態を保持する。
  - `resolvers.ts` に 6 つのリゾルバを追加する。
  - BFF テストに mock client を使った mutation / query テストを追加する。

- **完了条件**
  - `bun test` が既存テストを含めて全て通る。
  - `bff/schema.graphql` の変更後、 `bun scripts/sync-graphql.ts` がエラーなく実行できる。

### Packet 2: PureScript GraphQL クライアントと状態管理

- **対象ファイル**
  - `src/App/Api/GraphQL.purs`
  - `src/App/Api/GraphQL/Types.purs`（必要に応じて `RelationResponse` を追加）
  - `src/App/Message.purs`
  - `src/App/Model.purs`
  - `src/Client/Update.purs`
  - `src/Generated/`（再生成）

- **作業内容**
  - `bun scripts/sync-graphql.ts` を実行して生成型を更新する。
  - `RelationResponse` 型とその Decode/Encode インスタンスを追加する。
  - `GraphQL.purs` に 6 つの関数を追加する。
  - `Message.purs` にブロック / ミュート関連の Message を追加する。
  - `Model.purs` に `blocks` / `mutes` の `RemoteData` フィールドを追加する。
  - `Update.purs` に各 Message のハンドラを追加し、操作成功後にローカル state を更新または再フェッチする。

- **完了条件**
  - `spago build` が成功する。
  - 新しい GraphQL 関数が型検査を通る。

### Packet 3: UI 実装とルーティング

- **対象ファイル**
  - `src/App/Route.purs`
  - `src/App/View.purs`
  - `src/App/View/AccountDetail.purs`
  - `src/App/View/Settings.purs` または新規 View ファイル
  - `src/App/Theme.purs`（必要に応じてボタン用クラス追加）

- **作業内容**
  - アカウント詳細画面にブロック / ミュートボタンを追加する。未認証時は非表示またはログイン誘導にする。
  - ブロック / ミュート一覧を表示するため、 `Route.purs` に必要な route を追加する（配置方針は open-questions.md 解決後）。
  - 一覧 View で `RelationResponse` を受け取り、 `targetType` / `target` をテーブルまたはカード形式で表示する。
  - 一覧項目に解除ボタンを配置し、 `UnblockAccount` / `UnmuteAccount` Message を発行する。

- **完了条件**
  - `spago build` と `spago test` が成功する。
  - `./scripts/dev.sh mock` 起動後、ブラウザでブロック / ミュートの追加・一覧・解除が動作する。
