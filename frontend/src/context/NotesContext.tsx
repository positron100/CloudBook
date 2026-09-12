import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Note } from "@shared/types";
import * as api from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { useResumeRevalidation } from "@/hooks/useResumeRevalidation";
import { clearNotesCache, readNotesCache, writeNotesCache } from "@/lib/notesCache";

// "refreshing" = notes are already on screen and a background re-fetch is in
// flight — as opposed to "loading", the blank-slate first fetch. Both are
// non-destructive: neither ever clears `notes` on its own (see `getNotes`).
type NotesStatus = "idle" | "loading" | "refreshing" | "ready" | "error";

/** A mutation whose UI effect has already happened. `committed` resolves when
 *  the server confirms and rejects (after the optimistic change is rolled back)
 *  when it doesn't. The desk stays responsive either way. */
interface Pending<T = void> {
  committed: Promise<T>;
}

interface NotesContextValue {
  notes: Note[];
  status: NotesStatus;
  /** Last fetch/mutation error message, or null. */
  error: string | null;
  getNotes: () => Promise<void>;
  /** Re-fetch in the background only if the collection is older than the
   *  freshness window — used on returning to the workspace so cached notes
   *  show instantly and a stale list quietly catches up. No-op otherwise. */
  refreshIfStale: () => void;
  /** Inserts an optimistic note immediately; `note` is that provisional note
   *  (its `_id` stays stable as the React identity for the whole session) and
   *  `committed` resolves once the server has persisted it. */
  addNote: (title: string, description: string, tag: string) => Pending<Note> & { note: Note };
  /** Applies the edit immediately; `committed` rejects + restores on failure. */
  editNote: (id: string, title: string, description: string, tag: string) => Pending;
  /** Removes the note immediately; `committed` rejects + re-inserts on failure. */
  deleteNote: (id: string) => Pending;
  /** True while `id` is a provisional (not-yet-persisted) note. */
  isPending: (id: string) => boolean;
}

// Exported so a dev-only preview harness can supply mock data (see
// views/WorkspacePreview). Production code uses <NotesProvider> + useNotes().
export const NotesContext = createContext<NotesContextValue | null>(null);
export type { NotesContextValue };

/** A loaded collection older than this is refreshed in the background on the
 *  next return to the workspace (the cached list still shows immediately). */
const STALE_MS = 60_000;

let tempSeq = 0;
const tempId = () => `temp-${Date.now().toString(36)}-${(tempSeq++).toString(36)}`;
const isTemp = (id: string) => id.startsWith("temp-");

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [status, setStatus] = useState<NotesStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  // The in-flight fetch, if any. Concurrent callers join it rather than being
  // dropped — so a second trigger (React re-mount, a route re-entry) never
  // leaves the store un-loaded.
  const inFlight = useRef<Promise<void> | null>(null);
  // When the collection was last successfully loaded — drives `refreshIfStale`.
  const loadedAt = useRef(0);
  // Local (stable) id -> persisted server id, once the note is confirmed.
  const serverIds = useRef(new Map<string, string>());
  const pendingIds = useRef(new Set<string>());
  // Mirror of `notes` for synchronous reads inside mutation handlers (a
  // useState updater runs during the next render, too late for that).
  const notesRef = useRef<Note[]>([]);
  notesRef.current = notes;

  const realId = (localId: string) => serverIds.current.get(localId) ?? localId;

  const getNotes = useCallback(() => {
    inFlight.current ??= (async () => {
      // Already showing a collection? This is a background refresh, not the
      // first paint — keep the board on screen and only flip the
      // blank-slate "loading" state when there's nothing to show yet.
      setStatus((s) => (s === "ready" || s === "refreshing" ? "refreshing" : "loading"));
      setError(null);
      // Time-box the request. Without this a request that never settles (a
      // dropped connection during a noisy first load, a stalled cold start)
      // would leave `status` wedged at "loading" with a dead in-flight promise
      // that every later trigger just joins — the store then never recovers
      // without a full reload. On timeout we surface an error the caller can
      // retry instead.
      const ctrl = new AbortController();
      const timeout = window.setTimeout(() => ctrl.abort(), 12_000);
      try {
        setNotes(await api.fetchNotes(ctrl.signal));
        loadedAt.current = Date.now();
        setStatus("ready");
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof DOMException && err.name === "AbortError"
            ? "Timed out reaching your notes."
            : messageOf(err),
        );
      } finally {
        window.clearTimeout(timeout);
        inFlight.current = null;
      }
    })();
    return inFlight.current;
  }, []);

  const refreshIfStale = useCallback(() => {
    if (inFlight.current) return;
    if (status === "ready" && Date.now() - loadedAt.current > STALE_MS) void getNotes();
  }, [status, getNotes]);

  const addNote = useCallback((title: string, description: string, tag: string) => {
    const localId = tempId();
    const temp: Note = {
      _id: localId,
      user: "me",
      title,
      description,
      tag,
      date: new Date().toISOString(),
    };
    pendingIds.current.add(localId);
    setNotes((prev) => [...prev, temp]);

    const committed = api
      .addNote({ title, description, tag })
      .then((real) => {
        pendingIds.current.delete(localId);
        serverIds.current.set(localId, real._id);
        // Merge server fields but keep the local id as the stable React key —
        // the card never remounts, so the page that landed stays put.
        const merged = { ...real, _id: localId };
        setNotes((prev) => prev.map((n) => (n._id === localId ? merged : n)));
        return merged;
      })
      .catch((err) => {
        pendingIds.current.delete(localId);
        setNotes((prev) => prev.filter((n) => n._id !== localId));
        setError(messageOf(err));
        throw err;
      });

    return { note: temp, committed };
  }, []);

  const editNote = useCallback(
    (id: string, title: string, description: string, tag: string) => {
      const before = notesRef.current.find((n) => n._id === id);
      setNotes((prev) =>
        prev.map((n) => (n._id === id ? { ...n, title, description, tag } : n)),
      );

      const server = realId(id);
      const committed =
        isTemp(server) || !before
          ? Promise.resolve()
          : api
              .updateNote(server, { title, description, tag })
              .then((updated) => {
                setNotes((prev) => prev.map((n) => (n._id === id ? { ...n, ...updated, _id: id } : n)));
              })
              .catch((err) => {
                const restore = before as Note;
                setNotes((prev) => prev.map((n) => (n._id === id ? restore : n)));
                setError(messageOf(err));
                throw err;
              });

      return { committed };
    },
    [],
  );

  const deleteNote = useCallback((id: string) => {
    const index = notesRef.current.findIndex((n) => n._id === id);
    const removed = index >= 0 ? notesRef.current[index] : undefined;
    setNotes((prev) => prev.filter((n) => n._id !== id));

    const server = realId(id);
    const committed =
      isTemp(server) || !removed
        ? Promise.resolve()
        : api.deleteNote(server).then(
            () => {
              serverIds.current.delete(id);
            },
            (err) => {
              if (removed) {
                setNotes((prev) => {
                  const next = [...prev];
                  next.splice(Math.min(index, next.length), 0, removed as Note);
                  return next;
                });
              }
              setError(messageOf(err));
              throw err;
            },
          );

    return { committed };
  }, []);

  const isPending = useCallback((id: string) => pendingIds.current.has(id), []);

  // Start loading the collection as soon as the app mounts with a stored token,
  // in parallel with the auth check — the notes request only needs the token,
  // not the resolved user. This decouples the first paint of the workspace from
  // both the auth round-trip and the Home view's mount: by the time the route
  // gate lets Workspace render, the notes are already in (or on their way),
  // instead of the fetch only starting after Home mounts.
  useEffect(() => {
    if (getToken()) void getNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Resilience cache, keyed to the confirmed user -----------------------
  // `user` only comes from AuthContext once `/getuser` has actually
  // succeeded, so a cache read here is never a guess at identity — it is
  // always the same account the token belongs to.
  const { user, status: authStatus } = useAuth();
  const userId = user?._id ?? null;
  // The last user id we actually had data for — used to clear *that* user's
  // cache on logout, since by the time status flips to "anonymous" `user` is
  // already null and we'd otherwise lose track of whose cache to invalidate.
  const lastUserId = useRef<string | null>(null);
  if (userId) lastUserId.current = userId;

  // Cache -> immediate UI, applied *during render* rather than in an effect —
  // deliberately. `userId` and `notes` becoming known can commit in the same
  // render (e.g. rehydration resolves the user before the real fetch lands),
  // and if this were a separate effect keyed on `[userId]`, it and the
  // write-through effect below (keyed on `[notes, userId]`) would BOTH fire
  // in that same effect flush, both still closing over this render's stale
  // `notes = []` — the write-through effect would write `[]` over a perfectly
  // good on-disk cache before this one's `setNotes` had a chance to land.
  // Calling `setState` conditionally during render (React's documented
  // pattern for "reset/derive state when an identity changes") sidesteps
  // that: React discards this render and immediately retries with the
  // corrected `notes` *before* committing, so no effect — including
  // write-through — ever observes the stale value paired with a real userId.
  const cacheCheckedFor = useRef<string | null>(null);
  if (userId && cacheCheckedFor.current !== userId) {
    cacheCheckedFor.current = userId;
    if (notesRef.current.length === 0) {
      const cached = readNotesCache(userId);
      if (cached && cached.length > 0) {
        notesRef.current = cached;
        setNotes(cached);
      }
    }
  }

  // Write-through: whatever the client currently considers its notes —
  // fetched, optimistically created/edited/deleted, rolled back — becomes the
  // cached snapshot for this user. Driven by `notes` itself rather than by
  // individual call sites, so every mutation path stays in sync automatically
  // and can never drift from what's actually on screen. Safe to run
  // unconditionally in an effect: by the time any effect for a commit runs,
  // the render-time backfill above has already resolved `notes` to its
  // correct value for this `userId`, so there is no stale state left to write.
  useEffect(() => {
    if (!userId) return;
    writeNotesCache(userId, notes);
  }, [notes, userId]);

  // A confirmed logout (user-initiated, or a genuine 401 from AuthContext —
  // never a transient failure, which never flips `authStatus` at all) clears
  // both the in-memory board and that user's cache. This is also what stops a
  // second account signing in on the same tab from ever seeing the first
  // account's notes for even a frame: the store is empty before the new
  // session's own fetch/cache-read can run.
  useEffect(() => {
    if (authStatus !== "anonymous") return;
    const prev = lastUserId.current;
    if (prev) clearNotesCache(prev);
    lastUserId.current = null;
    // So a fresh login as the *same* user (no full page reload in between)
    // gets a clean render-time cache check again instead of being skipped as
    // "already seen".
    cacheCheckedFor.current = null;
    setNotes([]);
    setStatus("idle");
    setError(null);
  }, [authStatus]);

  // Tab resumed / regained focus / network back — the same staleness-gated,
  // in-flight-guarded refresh `refreshIfStale` already uses elsewhere, just
  // also triggered by resume signals rather than only a view mounting.
  useResumeRevalidation(refreshIfStale);

  const value = useMemo<NotesContextValue>(
    () => ({ notes, status, error, getNotes, refreshIfStale, addNote, editNote, deleteNote, isPending }),
    [notes, status, error, getNotes, refreshIfStale, addNote, editNote, deleteNote, isPending],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesContextValue {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within <NotesProvider>");
  return ctx;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}
