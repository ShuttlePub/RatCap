/** Validate return_to as a safe relative path (no open redirect) */
export function safeReturnTo(input: string | null): string {
  const raw = input || "/";
  // Must start with "/" and must NOT start with "//" or "/\" (protocol-relative or backslash tricks)
  if (/^\/(?![/\\])/.test(raw)) return raw;
  return "/";
}
