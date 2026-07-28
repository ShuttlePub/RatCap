# account-deactivation — open questions

> [../../clarifications/open.md](../../clarifications/open.md) も参照。

## Open questions blocking this feature

1. **所有権・権限チェックの詳細**
   - Emumet の `DELETE /api/v1/accounts/{account_id}` は「Owner only」と記載されているが、Editor/Signer も含めた `account_sign` 権限のどのレベルまで許可されるか？
   - 403 時のフロントエンドメッセージを「権限がありません」とするか、または「所有者のみ削除できます」とするか。

2. **カスケード削除の範囲**
   - アカウント削除時に、プロフィール・メタデータ・フォロー関係・投稿はすべて Emumet 側でカスケード削除されるか？
   - Ratcap 側で追加でクリーンアップする必要があるか（例: セッションキャッシュ、IndexedDB 等）。

3. **削除後のセッション扱い**
   - 削除したアカウントがユーザーが持つ唯一のアカウントだった場合、BFF 側でセッションを無効化するか、それともユーザーはログイン状態のまま残るか。
   - ログイン維持の場合、トップページのアカウント一覧が空になることへの UX 対応が必要か。

4. **SSR 時の削除ボタン表示方針**
   - サーバー側 HTML に削除ボタンを含めない方針とするが、HTML レイアウトのシフトを防ぐため、ボタンを非表示にするか disabled 表示にするか。
