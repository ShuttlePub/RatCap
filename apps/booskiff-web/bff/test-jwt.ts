// ============================================================
// mock モード用テスト JWT (RS256) 署名 + PEM パース。
// mock login はここで署名した実 JWT をセッションの accessToken とする。
// 秘密鍵は env TEST_JWT_PRIVATE_KEY_PEM_BASE64 (PEM を base64 化したもの)。
// 対応する公開鍵は /.well-known/jwks.json (bff/jwks.ts) から取得でき、
// e2e / core 側はその JWKS で署名検証する。
// ============================================================

import { base64UrlEncode } from "@shuttlepub/auth-bun";

export type TestJwtConfig = {
  readonly privateKeyPemBase64: string;
  readonly issuer: string;
  readonly ttlSeconds: number;
};

/** PEM (BEGIN/END 行と空白を除去) → DER バイト列 */
export function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function importPrivateKey(privateKeyPemBase64: string): Promise<CryptoKey> {
  if (privateKeyPemBase64.length === 0) {
    throw new Error("TEST_JWT_PRIVATE_KEY_PEM_BASE64 is required to sign mock session JWTs");
  }
  const der = pemToDer(atob(privateKeyPemBase64));
  return crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

/** RS256 で署名したテスト JWT。claims: iss / sub / owner_type=account / iat / exp */
export async function signTestJwt(config: TestJwtConfig, subject: string, nowSeconds: number): Promise<string> {
  const key = await importPrivateKey(config.privateKeyPemBase64);
  const header = { alg: "RS256", typ: "JWT", kid: "test-key" };
  const payload = {
    iss: config.issuer,
    sub: subject,
    owner_type: "account",
    iat: nowSeconds,
    exp: nowSeconds + config.ttlSeconds,
  };
  const signingInput = `${base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)))}.${base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}
