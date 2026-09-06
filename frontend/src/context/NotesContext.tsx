import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { Note } from "@shared/types";
import * as api from "@/lib/api";

type NotesStatus = "idle" | "loading" | "ready" | "error";

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

let tempSeq = 0;
const tempId = () => `temp-${Date.now().toString(36)}-${(tempSeq++).toString(36)}`;
const isTemp = (id: string) => id.startsWith("temp-");

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [status, setStatus] = useState<NotesStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  // Local (stable) id -> persisted server id, once the note is confirmed.
  const serverIds = useRef(new Map<string, string>());
  const pendingIds = useRef(new Set<string>());
  // Mirror of `notes` for synchronous reads inside mutation handlers (a
  // useState updater runs during the next render, too late for that).
  const notesRef = useRef<Note[]>([]);
  notesRef.current = notes;

  const realId = (localId: string) => serverIds.current.get(localId) ?? localId;

  const getNotes = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus((s) => (s === "ready" ? s : "loading"));
    setError(null);
    try {
      setNotes(await api.fetchNotes());
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(messageOf(err));
    } finally {
      inFlight.current = false;
    }
  }, []);

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

  const value = useMemo<NotesContextValue>(
    () => ({ notes, status, error, getNotes, addNote, editNote, deleteNote, isPending }),
    [notes, status, error, getNotes, addNote, editNote, deleteNote, isPending],
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
