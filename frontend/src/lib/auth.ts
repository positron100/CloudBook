/**
 * Auth token persistence.
 *
 * The deployed production frontend stored the JWT under `localStorage["token"]`,
 * so that is the canonical key: new logins write `token` only. For migration
 * safety we also read the legacy `Token` key (used by an interim build) and, if
 * found, promote it to `token` on first read.
 *
 * localStorage (not an httpOnly cookie) is a known XSS trade-off; changing it
 * needs backend session work and is out of scope (backend is frozen).
 */
const TOKEN_KEY = "token";
const LEGACY_TOKEN_KEY = "Token";

export function getToken(): string | null {
  try {
    const current = localStorage.getItem(TOKEN_KEY);
    if (current) return current;
    const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacy) {
      // Promote once so the rest of the app only ever deals with `token`.
      localStorage.setItem(TOKEN_KEY, legacy);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    /* private mode / storage disabled — session just won't persist */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    /* no-op */
  }
}
