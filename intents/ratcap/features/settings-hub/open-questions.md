# settings-hub — open questions

> [../../clarifications/open.md](../../clarifications/open.md) も参照。

## Open questions blocking this feature

1. **アカウント設定セクションの詳細設計**
   - 設定ハブでアカウント一覧を直接表示するか、それとも「アカウント設定を開く」ボタンで `/` または `/accounts` へ遷移するか。
   - 各アカウントカードに表示する情報はアカウント名のみとするか、プロフィール画像や displayName も含めるか。

2. **ブロック/ミュートの将来位置**
   - ブロック/ミュート管理は設定ハブのサブセクションとして実装するか、独立した `/settings/blocks` ルートを追加するか。
   - 新しいルートを追加する場合、`src/App/Route.purs` の `Route` ADT に `SettingsBlocks` 等を追加する必要がある。

3. **アカウント削除導線の遷移先**
   - 設定ハブの「アカウントを削除」リンクは既存のアカウント詳細画面 (`/accounts/{id}`) の danger-zone へ遷移するか、新規に `/settings/accounts/{id}/delete` 等の専用ページを作成するか。
   - 専用ページにする場合、danger-zone コンポーネントを `App.View.Settings` または別モジュールに切り出す必要がある。

4. **表示設定のスコープ**
   - 既存のテーマ/形状選択は現在「即座に反映」されない可能性がある。保存ボタンを設けるか、即時反映をどう検知するか。
   - テーマ/形状の選択値を `Model` に永続化するか、localStorage 等に保存するか。

5. **未認証時の設定ページ挙動**
   - 現状の `isProtectedRoute` は `/login` 以外をすべて保護している。設定ページを未認証でも閲覧可能にするか、あるいはログインへリダイレクトするか。
