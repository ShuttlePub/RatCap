# ShuttlePub Frontends

ShuttlePub のフロントエンドを管理する Bun Workspaces モノレポです。

## Structure

- `apps/emumet-web/`: Emumet Web フロントエンド (PureScript + Flame SSR / Bun BFF)
- `apps/booskiff-web/`: Booskiff Drive Web フロントエンド (PureScript + Flame SSR / Bun BFF)
- `packages/design-tokens/`: 共有デザイントークン
- `packages/styles/`: 共有スタイル
- `packages/ui/`: 共有 UI
- `packages/auth-core/`: 共有認証コア
- `packages/auth-bun/`: Bun 向け認証

## Setup

```bash
bun install
```

アプリ固有の開発手順は [apps/emumet-web/README.md](apps/emumet-web/README.md) と [apps/booskiff-web/README.md](apps/booskiff-web/README.md) を参照してください。
