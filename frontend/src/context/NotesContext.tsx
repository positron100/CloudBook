import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { Note } from "@shared/types";
import * as api from "@/lib/api";

type NotesStatus = "idle" | "loading" | "ready" | "error";

interface NotesContextValue {
  notes: Note[];
  status: NotesStatus;
  /** Last fetch/mutation error message, or null. */
  error: string | null;
  getNotes: () => Promise<void>;
  /** Resolves with the created note so callers can animate it into place. */
  addNote: (title: string, description: string, tag: string) => Promise<Note>;
  editNote: (id: string, title: string, description: string, tag: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

// Exported so a dev-only preview harness can supply mock data (see
// views/WorkspacePreview). Production code uses <NotesProvider> + useNotes().
export const NotesContext = createContext<NotesContextValue | null>(null);
export type { NotesContextValue };

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [status, setStatus] = useState<NotesStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  // Guards against overlapping fetches (e.g. StrictMode double-invoke in dev).
  const inFlight = useRef(false);

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

  const addNote = useCallback(async (title: string, description: string, tag: string) => {
    const created = await api.addNote({ title, description, tag });
    setNotes((prev) => [...prev, created]);
    return created;
  }, []);

  const editNote = useCallback(
    async (id: string, title: string, description: string, tag: string) => {
      const updated = await api.updateNote(id, { title, description, tag });
      setNotes((prev) => prev.map((n) => (n._id === id ? { ...n, ...updated } : n)));
    },
    [],
  );

  const deleteNote = useCallback(async (id: string) => {
    await api.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n._id !== id));
  }, []);

  const value = useMemo<NotesContextValue>(
    () => ({ notes, status, error, getNotes, addNote, editNote, deleteNote }),
    [notes, status, error, getNotes, addNote, editNote, deleteNote],
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
