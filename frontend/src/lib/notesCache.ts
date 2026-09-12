import type { Note } from "@shared/types";

/**
 * A resilience cache, not a second source of truth. Keyed per user so one
 * account's notes can never bleed into another's — the id is always the
 * server-confirmed `user._id` from a successful `getUser`, never guessed.
 *
 * Used to (a) paint the board instantly from the last-known-good state while
 * the real fetch is still in flight or recovering from a transient failure,
 * and (b) survive a reload without a blank flash. The live fetch always wins
 * once it resolves — see `NotesContext`'s write-through effect.
 */
const PREFIX = "cloudbook:notes:";

function keyFor(userId: string): string {
  return `${PREFIX}${userId}`;
}

export function readNotesCache(userId: string): Note[] | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Note[]) : null;
  } catch {
    // Private mode, disabled storage, or corrupt JSON — treat as no cache.
    return null;
  }
}

export function writeNotesCache(userId: string, notes: Note[]): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(notes));
  } catch {
    /* storage full/disabled — the cache is best-effort */
  }
}

export function clearNotesCache(userId: string): void {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    /* no-op */
  }
}
