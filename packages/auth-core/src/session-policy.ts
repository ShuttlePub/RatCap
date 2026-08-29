export function isExpiringSoon(session: { expiresAt: number }, skewSeconds: number): boolean {
  return session.expiresAt - Math.floor(Date.now() / 1000) < skewSeconds;
}
