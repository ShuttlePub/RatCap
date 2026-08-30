// ============================================================
// bun test 用セットアップ — 各テストファイルの「最初の import」であること。
// @shuttlepub/auth-bun はモジュール定数 (cookie 名 / cookie secret 等) を
// import 時に process.env から解決するため、ここで先に確定させる。
// RSA 鍵対は鍵ファイルをコミットせず、その場で 1 回だけ生成して
// TEST_JWT_PRIVATE_KEY_PEM_BASE64 / TEST_JWT_JWKS_JSON 環境変数へ設定する。
// ============================================================

process.env.SESSION_COOKIE_NAME = "booskiff_session";
process.env.OAUTH_COOKIE_NAME = "booskiff_oauth";
process.env.APP_ORIGIN = "http://localhost:3000";

process.env.COOKIE_SECRET_BASE64 ??= base64OfRandom32();

function base64OfRandom32(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes));
}

export type TestKeys = {
  readonly privateKeyPemBase64: string;
  readonly publicKeyPem: string;
  readonly jwksJson: string;
};

function toPem(der: ArrayBuffer, label: string): string {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(der)));
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

async function generateTestKeys(): Promise<TestKeys> {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const privatePem = toPem(await crypto.subtle.exportKey("pkcs8", pair.privateKey), "PRIVATE KEY");
  const publicPem = toPem(await crypto.subtle.exportKey("spki", pair.publicKey), "PUBLIC KEY");
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const jwksJson = JSON.stringify({
    keys: [{ kid: "test-key", use: "sig", alg: "RS256", kty: jwk.kty, n: jwk.n, e: jwk.e }],
  });
  return { privateKeyPemBase64: btoa(privatePem), publicKeyPem: publicPem, jwksJson };
}

export const TEST_KEYS: TestKeys = await generateTestKeys();

const cookieSecret = process.env.COOKIE_SECRET_BASE64;
if (!cookieSecret) throw new Error("test-setup must set COOKIE_SECRET_BASE64");
export const TEST_COOKIE_SECRET_BASE64: string = cookieSecret;

process.env.TEST_JWT_PRIVATE_KEY_PEM_BASE64 = TEST_KEYS.privateKeyPemBase64;
process.env.TEST_JWT_JWKS_JSON = TEST_KEYS.jwksJson;
