# Ratcap

[Emumet](https://github.com/ShuttlePub/Emumet) の Web フロント (予定) 。PureScript + Flame によるSSR/クライアントハイドレーション構成で動作します。

## セットアップ

開発ツールは Nix flake + direnv で管理しています。ディレクトリに入ると自動で環境が整います。

```bash
bun install
```

## 開発

`./scripts/dev.sh [mode]` で 3 つのモードを切り替えます（省略時は `mock`）。

| モード | 用途 | 認証 | 監視 | バンドル | COOKIE_SECRET |
|--------|------|------|------|----------|---------------|
| `mock` | フロント開発（既定） | 内蔵 mock | あり | 通常 spago bundle | 不要 |
| `dev` | Kratos + Hydra 連携検証 | Kratos + Hydra + Emumet | あり | 通常 spago bundle | `scripts/.env.dev` に自動生成・永続化 |
| `release` | 本番ビルド（成果物のみ） | Kratos + Hydra + Emumet | なし | purs-backend-es + esbuild --minify + tailwind --minify | **ビルド実行時に環境変数で必須**（成果物起動時にも使用） |

```bash
./scripts/dev.sh mock        # mock モードで dev サーバー起動
./scripts/dev.sh dev         # real モードで dev サーバー起動（自動で .env.dev を作成）
COOKIE_SECRET_BASE64=$(openssl rand -base64 32) ./scripts/dev.sh release  # 最適化バンドルを dist/ に出力して終了
```

`mock` / `dev` はファイル監視 + 自動再バンドル + Bun dev サーバーを一括で起動します。`release` は `COOKIE_SECRET_BASE64` を環境変数で渡す必要があり（ビルド実行時にチェックします）、成果物の生成のみ行ってサーバーは起動しません。CI 用途です。`release` の成果物を起動する際にも別途 `COOKIE_SECRET_BASE64` を渡す必要があります（既存セッションを維持したい場合はビルド時と同じ値を、運用上問題なければ起動時に別途生成しても構いません）。

```bash
COOKIE_SECRET_BASE64="$YOUR_PERSISTENT_SECRET" USE_MOCK=false bun index.ts
```

## 個別コマンド

```bash
spago build                # ビルド
spago test                 # テスト
bun index.ts               # サーバー起動（要事前ビルド）
```

## 認証

`index.ts` は BFF (Backend-for-Frontend) パターンで認証を処理します。Mock モードと Real モード (Kratos + Hydra) の 2 つの動作モードがあります。

### 起動モード

| モード | 起動方法 | 認証先 |
|--------|----------|--------|
| Mock | `./scripts/dev.sh mock` | BFF 内蔵の mock auth |
| Real (開発) | `./scripts/dev.sh dev` | Kratos + Hydra + Emumet |
| Real (本番) | `COOKIE_SECRET_BASE64=... ./scripts/dev.sh release` で生成 → `COOKIE_SECRET_BASE64=... USE_MOCK=false bun index.ts` | Kratos + Hydra + Emumet |

### 環境変数

`mock` モードではすべてデフォルト値で動作します。`dev` モードでは `./scripts/dev.sh dev` 初回実行時に `scripts/.env.dev` が自動生成され、以降の起動でも同じ `COOKIE_SECRET_BASE64` が再利用されます（git 管理外）。`release` モードはビルド実行時と成果物起動時の両方で `COOKIE_SECRET_BASE64` を環境変数として**必ず**指定してください（ビルド時にチェックされます）。

#### 基本

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `USE_MOCK` | `true`（`"false"` 以外はすべて mock） | 認証モード切替 |
| `APP_ORIGIN` | `http://localhost:3000` | Ratcap のオリジン |

#### 外部サービス URL（Real モードのみ）

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `KRATOS_PUBLIC_URL` | `http://localhost:4433` | Kratos Public API |
| `HYDRA_PUBLIC_URL` | `http://localhost:4444` | Hydra Public API |
| `EMUMET_API_URL` | `http://localhost:8080` | Emumet バックエンド |

#### OAuth2 クライアント設定（Real モードのみ）

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `HYDRA_CLIENT_ID` | `ratcap-bff` | OAuth2 client ID |
| `HYDRA_CLIENT_SECRET` | `dev-secret` | OAuth2 client secret |
| `HYDRA_REDIRECT_URI` | `${APP_ORIGIN}/auth/callback` | OAuth2 callback URI |
| `HYDRA_SCOPES` | `openid offline_access email` | 要求スコープ |
| `HYDRA_AUDIENCE` | `account` | トークンの audience |

#### Cookie / セッション

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `SESSION_COOKIE_NAME` | `ratcap_session` | セッション cookie 名 |
| `OAUTH_COOKIE_NAME` | `ratcap_oauth` | OAuth state cookie 名 |
| `COOKIE_SECRET_BASE64` | なし（**`release` ビルド時 / 起動時必須** / `dev` は自動生成・永続化） | AES-GCM 暗号化キー（32 バイト、base64 エンコード） |
| `OAUTH_STATE_TTL_SECONDS` | `300`（5 分） | OAuth state の有効期限 |
| `SESSION_REFRESH_SKEW_SECONDS` | `60`（1 分） | トークンの lazy refresh 開始マージン |

#### `COOKIE_SECRET_BASE64` の生成方法

```bash
# 32 バイトのランダムキーを base64 エンコード
openssl rand -base64 32
```

### Hydra OAuth2 クライアント登録

Real モードで初回起動する前に、Hydra に OAuth2 クライアントを登録する必要があります。

```bash
# Hydra が起動している状態で実行
bun scripts/register-hydra-client.ts
```

スクリプトはクライアントが既に存在すれば更新、なければ新規作成します。環境変数で `HYDRA_ADMIN_URL`（デフォルト: `http://localhost:4445`）, `HYDRA_CLIENT_ID`, `HYDRA_CLIENT_SECRET`, `APP_ORIGIN` をカスタマイズできます。

### Mock モードの認証情報

- **メールアドレス**: 任意の文字列
- **パスワード**: `password`
