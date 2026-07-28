# block-mute — design decisions

> 目的は [overview.md](overview.md) を参照。ドメイン横断の ADR は [../../decisions/](../../decisions/) を参照。

## Decisions

- **GraphQL スキーマの形状**
  - `Relation` 型を新設し、 `id` (ID!)、 `targetType` (String!)、 `target` (String!) の 3 フィールドを持たせる。 Emumet のレスポンス `target_type` / `target` を camelCase に写像する。
  - 一覧は `RelationConnection { items: [Relation!]! }` とし、現行の `AccountConnection` と同じく `first` / `last` カーソルは持たせない（Emumet 側がページネーションを返していないため）。

- **BFF 実装パターン**
  - リゾルバは `withEmumetErrors` + `requireEmumet` で実装し、エラーコードは既存の `UNAUTHENTICATED` / `NOT_FOUND` / `INTERNAL_SERVER_ERROR` パターンに従う。
  - 成功時の Boolean mutation は `deleteMetadata` と同様に `true` を返す。

- **EmumetClient 契約**
  - ブロック / ミュートの追加・解除は `Promise<void>` を返し、成功を 204 などで判定する。
  - 一覧取得は `Relation[]` を返し、 `real.ts` では `items` フィールドから配列を取り出す。

- **target 入力値の扱い**
  - BFF は target の形式を検証せず、文字列をそのまま Emumet へ送信する。クライアント側では前後空白をトリムする。
  - これにより、Emumet 側の仕様変更（新しい target 形式の追加など）に BFF 変更なく追従できる。

- **UI の配置方針 (2026-07-28 決定)**
  - ブロック / ミュートの**操作**はアカウント個別ページ (`src/App/View/AccountDetail.purs`) で行う。
  - ブロック / ミュート済みアカウントの**一覧表示**は Settings 配下 (`src/App/View/Settings.purs`) にセクションとして配置する。

- **enforcement の所在 (2026-07-28 決定)**
  - ブロック / ミュートの正源は Emumet のアクターレベルに置く。ActivityPub の Block はアクター間アクティビティであり、連合の拒否判定もアクター単位で行われるため、identity レベルへの移管は enforcement の二重化を招く。リモートの identity は特定不能であり、粒度としても actor 単位が自然。
  - ShuttlePub 側に「自分の全アクターへの fan-out ブロック」等の集約 API が将来追加されたとしても、それは Emumet の per-actor ブロックへの便利レイヤーであり、Ratcap 側の管理画面 (本 feature) は変わらず必要。

- **状態更新方式**
  - mutation 成功後は対象アカウントの詳細を再フェッチするか、ローカル state で即座にリストを更新する。
  - 一覧画面では `FetchBlocks` / `FetchMutes` 完了後に `RemoteData` を更新する。
