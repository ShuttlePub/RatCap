# oauth2-consent — design decisions

> See [overview.md](overview.md) for goals and [../../decisions/](../../decisions/) for cross-domain ADRs.

## Decisions

- D1: 同意 UI は Ratcap 内に standalone ページとして実装する方向を基本とする。
  - 理由：Ratcap は既に BFF (`index.ts`) と SSR (`Server.purs`) を持ち、認証関連の UI（login 等）を提供している。Emumet テンプレートに UI を置くと、フロントのスタイリング・メンテナンスが分断される。
  - 影響：新しいルート（例：`/oauth2/consent`）を `index.ts` に追加し、SSR またはフォーム送信を処理する。Flame 通常 SPA ページではなく、サーバーサイド生成の HTML またはミニマルなフォームページを使う。
- D2: `consent_challenge` は URL クエリパラメータで受け取り、POST 時に hidden フィールドまたは同じクエリパラメータで引き継ぐ。
  - 理由：Hydra の consent フローは challenge を URL クエリでやり取りするのが標準。Ratcap 側で独自にセッションに保存する必要はない。
  - 影響：HTML フォームアクションは `?consent_challenge=...` を含むか、フォーム内に hidden input を含める。
- D3: `POST /oauth2/consent` のレスポンスは 302 リダイレクトであり、サーバー側またはフォーム送信側でその `Location` をそのまま返す。
  - 理由： consent フローは Hydra が最終的なリダイレクト先を決定する。Ratcap 側で任意のリダイレクト先を解釈しない。
  - 影響：AJAX ではなく通常フォーム POST / サーバーサイドリダイレクトを使う方が実装が単純。
- D4: 認証状態は既存の `ratcap_session` cookie または Hydra 側のログインセッションから解決する。新しい独自セッション機構は作成しない。
  - 理由： consent フローはユーザーが既に Kratos/Hydra ログインを済ませた後に呼ばれる。Ratcap 側のセッションはそのまま利用可能。
- D5: mock 認証モードでは本機能は無効またはスキップする。
  - 理由： consent フローは real モードの Hydra/Kratos 連携でしか発生しない。mock 時はテスト対象外とする。
- D6: Hydra の consent URL を Ratcap 側に向ける設定変更を行う (2026-07-28 決定)。
  - 理由： D1 で Ratcap ホストが確定したため、Hydra が現在向けている Emumet `/oauth2/consent` から Ratcap の consent ページへリダイレクト先を変更する必要がある。
  - 影響： Hydra / デプロイ設定の変更を packet の成果物に含める。
