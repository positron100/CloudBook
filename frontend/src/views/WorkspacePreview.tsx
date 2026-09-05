import { useCallback, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Note } from "@shared/types";
import { NotesContext, type NotesContextValue } from "@/context/NotesContext";
import Workspace from "./Workspace";

/**
 * Dev-only (`/workspace-preview`) harness — renders the real Workspace against
 * an in-memory notes store so the workspace UI can be visually reviewed without
 * a live backend. `?state=empty|error|loading` forces a state. Tree-shaken from
 * production builds.
 */
const SAMPLE: Note[] = [
  ["Reading list", "Piranesi · The Overstory · A Psalm for the Wild-Built. Start with Piranesi.", "Books", 2],
  ["Standup", "Shipped the tilt interaction. Blocked on the staging deploy — ping ops.", "Work", 6],
  ["Groceries", "Oat milk, sourdough, the good olive oil, chili crisp, lemons.", "Home", 26],
  ["Trip idea", "Long weekend in the Lake District — Grasmere, hike Helvellyn, gingerbread.", "Travel", 74],
  ["Quote", "\"The palace is a labyrinth of vestibules.\" — keep for the essay intro.", "Books", 120],
  ["Fix later", "Card dog-ear should fold, not just cut. Revisit with a subtle gradient.", "Work", 200],
  ["Call mum", "Sunday. Ask about the garden.", "Home", 320],
  ["Gift ideas", "Dad: the coffee grinder. Sister: that ceramics class voucher.", "Home", 500],
].map(([title, description, tag, daysAgo], i) => ({
  _id: `preview-${i}`,
  user: "preview",
  title: title as string,
  description: description as string,
  tag: tag as string,
  date: new Date(Date.now() - (daysAgo as number) * 86_400_000).toISOString(),
}));

export default function WorkspacePreview() {
  const [params] = useSearchParams();
  const forced = params.get("state");
  const [notes, setNotes] = useState<Note[]>(
    forced === "empty" || forced === "error" ? [] : SAMPLE,
  );
  const nextId = useRef(SAMPLE.length);

  const addNote = useCallback(async (title: string, description: string, tag: string) => {
    setNotes((p) => [
      ...p,
      { _id: `preview-${nextId.current++}`, user: "preview", title, description, tag, date: new Date().toISOString() },
    ]);
  }, []);
  const editNote = useCallback(async (id: string, title: string, description: string, tag: string) => {
    setNotes((p) => p.map((n) => (n._id === id ? { ...n, title, description, tag } : n)));
  }, []);
  const deleteNote = useCallback(async (id: string) => {
    setNotes((p) => p.filter((n) => n._id !== id));
  }, []);

  const value = useMemo<NotesContextValue>(
    () => ({
      notes,
      status: forced === "loading" ? "loading" : forced === "error" ? "error" : "ready",
      error: forced === "error" ? "Preview error" : null,
      getNotes: async () => {},
      addNote,
      editNote,
      deleteNote,
    }),
    [notes, forced, addNote, editNote, deleteNote],
  );

  return (
    <NotesContext.Provider value={value}>
      <Workspace />
    </NotesContext.Provider>
  );
}
