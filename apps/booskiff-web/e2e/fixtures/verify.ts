import { readFile } from "node:fs/promises";
import { join } from "node:path";

const FIXTURE_DIR = import.meta.dir;
const ALG = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as const;
const SAMPLE_JWT = {
  header: { alg: "RS256", typ: "JWT", kid: "test-key" },
  payload: {
    iss: "http://web:3100",
    sub: "e2e-user",
    owner_type: "account",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 600,
  },
};

type RsaJwk = { kty: string; n: string; e: string };

function isRsaJwk(value: unknown): value is RsaJwk {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return record.kty === "RSA" && typeof record.n === "string" && typeof record.e === "string";
}

function pemToPkcs8Bytes(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem
    .split("\n")
    .filter((line) => !line.startsWith("-----") && line.trim() !== "")
    .join("");
  return new Uint8Array(Buffer.from(body, "base64"));
}

function base64UrlEncode(value: string | object): string {
  const json = typeof value === "string" ? value : JSON.stringify(value);
  return Buffer.from(json, "utf8").toString("base64url");
}

async function main(): Promise<void> {
  const pem = await readFile(join(FIXTURE_DIR, "jwtRS256.pkcs8.pem"), "utf8");
  const jwksRaw: unknown = JSON.parse(await readFile(join(FIXTURE_DIR, "jwks.json"), "utf8"));

  const keys: unknown = typeof jwksRaw === "object" && jwksRaw !== null
    ? (jwksRaw as Record<string, unknown>).keys
    : undefined;
  if (!Array.isArray(keys) || keys.length !== 1 || !isRsaJwk(keys[0])) {
    throw new Error("jwks.json must contain exactly one RSA JWK with n and e");
  }
  const jwk = keys[0];

  const privateKey = await crypto.subtle.importKey("pkcs8", pemToPkcs8Bytes(pem), ALG, false, [
    "sign",
  ]);
  const publicKey = await crypto.subtle.importKey("jwk", { ...jwk, key_ops: ["verify"] }, ALG, false, [
    "verify",
  ]);

  const signingInput = `${base64UrlEncode(SAMPLE_JWT.header)}.${base64UrlEncode(SAMPLE_JWT.payload)}`;
  const signature = await crypto.subtle.sign(
    ALG.name,
    privateKey,
    new Uint8Array(Buffer.from(signingInput, "utf8")),
  );
  const token = `${signingInput}.${Buffer.from(signature).toString("base64url")}`;

  const [headerPart, payloadPart, signaturePart] = token.split(".");
  if (!headerPart || !payloadPart || !signaturePart) {
    throw new Error("signed token is malformed");
  }
  const verified = await crypto.subtle.verify(
    ALG.name,
    publicKey,
    new Uint8Array(Buffer.from(signaturePart, "base64url")),
    new Uint8Array(Buffer.from(`${headerPart}.${payloadPart}`, "utf8")),
  );

  if (!verified) {
    console.error("FAIL: JWKS does not verify a JWT signed by jwtRS256.pkcs8.pem");
    process.exit(1);
  }
  console.log("OK: PKCS8 key signs and JWKS verifies (kid test-key)");
}

await main();
