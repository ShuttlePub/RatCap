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

## 認証

`index.ts` は BFF (Backend-for-Frontend) パターンで認証を処理します。Mock モードと Real モード (Kratos + Hydra) の 2 つの動作モードがあります。

### 起動モード

| モード | 起動方法 | 認証先 |
|--------|----------|--------|
| Mock（デフォルト） | `./scripts/dev.sh` | BFF 内蔵の mock auth |
| Real | `USE_MOCK=false ./scripts/dev.sh` | Kratos + Hydra + Emumet |

### 環境変数

Mock モードではすべてデフォルト値で動作します。Real モードでは `COOKIE_SECRET_BASE64` が**必須**です。

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
| `HYDRA_SCOPES` | `openid offline_access` | 要求スコープ |
| `HYDRA_AUDIENCE` | `account` | トークンの audience |

#### Cookie / セッション

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `SESSION_COOKIE_NAME` | `ratcap_session` | セッション cookie 名 |
| `OAUTH_COOKIE_NAME` | `ratcap_oauth` | OAuth state cookie 名 |
| `COOKIE_SECRET_BASE64` | なし（**Real モード必須**） | AES-GCM 暗号化キー（32 バイト、base64 エンコード） |
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
