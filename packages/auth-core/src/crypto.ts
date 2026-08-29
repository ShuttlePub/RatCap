import { base64UrlEncode, base64UrlDecode } from "./codec.ts";

export async function importCookieKey(secretBase64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(secretBase64), c => c.charCodeAt(0));
  if (raw.length !== 32) throw new Error("COOKIE_SECRET_BASE64 must decode to exactly 32 bytes");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** Encrypt JSON-serializable data → base64url string (iv:ciphertext) */
export async function sealWithKey<T>(key: CryptoKey, data: T): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  // Concatenate iv + ciphertext, encode as base64url
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv);
  combined.set(ciphertext, iv.length);
  const encoded = base64UrlEncode(combined);
  console.log("sealCookie: plaintext length:", plaintext.length, "combined length:", combined.length, "encoded length:", encoded.length);
  return encoded;
}

/** Decrypt base64url string → parsed JSON, or null on failure */
export async function unsealWithKey<T>(key: CryptoKey, value: string): Promise<T | null> {
  try {
    const combined = base64UrlDecode(value);
    console.log("unsealCookie: input length:", value.length, "decoded length:", combined.length);
    if (combined.length < 13) return null; // 12-byte IV + at least 1 byte
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch (err) {
    console.error("unsealCookie failed:", err);
    return null;
  }
}

export function randomBase64Url(bytes: number): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(hash));
}
