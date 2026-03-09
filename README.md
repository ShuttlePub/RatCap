# Ratcap

[Emumet](https://github.com/ShuttlePub/Emumet) の Web フロント (予定) 。PureScript + Flame によるSSR/クライアントハイドレーション構成で動作します。

## セットアップ

開発ツールは Nix flake + direnv で管理しています。ディレクトリに入ると自動で環境が整います。

```bash
bun install
```

## 開発

```bash
./scripts/dev.sh
```

ビルド・ファイル監視・開発サーバーが一括で起動します。

## 個別コマンド

```bash
spago build                # ビルド
spago test                 # テスト
bun index.ts               # サーバー起動（要事前ビルド）
```
