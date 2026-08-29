import type { MockSession } from "./types.ts";

export function encodeMockCookie(data: MockSession): string {
  return btoa(JSON.stringify(data));
}

export function decodeMockCookie(value: string): MockSession | null {
  try {
    const parsed = JSON.parse(atob(value));
    if (typeof parsed.token === "string" && typeof parsed.username === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

export function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - str.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
