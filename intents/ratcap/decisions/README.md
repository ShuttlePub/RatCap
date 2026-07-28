# decisions — ratcap ドメイン

ドメイン横断の設計判断を記録する場所。feature 個別の判断は各 feature 配下の `decisions.md` を参照。

## 既存のドメイン横断判断

- **BFF 経由のデータアクセス**: フロントエンドは Emumet REST API を直接呼ばず、BFF の GraphQL (`/graphql`) 経由とする。新機能追加時は `bff/schema.graphql` の拡張が前提。
- **SDL が single source of truth**: スキーマ変更後は `bun scripts/sync-graphql.ts` で PureScript 型を再生成し、生成物はコミットする。
