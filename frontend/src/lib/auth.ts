/**
 * Auth token persistence. Kept in localStorage under the key `Token` — the same
 * key the pre-revamp app used, so existing logged-in users are not signed out
 * by this change.
 *
 * localStorage (not an httpOnly cookie) is a known XSS trade-off; revisiting it
 * would require backend session changes and is deferred.
 */
const TOKEN_KEY = "Token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* private mode / storage disabled — session just won't persist */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* no-op */
  }
}
