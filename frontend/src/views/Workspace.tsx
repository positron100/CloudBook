import { useEffect, useMemo, useState, useDeferredValue, useCallback } from "react";
import type { Note } from "@shared/types";
import { useNotes } from "@/context/NotesContext";
import { useToast } from "@/context/ToastContext";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { deriveTags, queryNotes, type SortKey } from "@/lib/notesQuery";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { NoteToolbar } from "@/components/workspace/NoteToolbar";
import { Notebook } from "@/components/workspace/Notebook";
import { NoteStack } from "@/components/workspace/NoteStack";
import { NoteStackSkeleton } from "@/components/workspace/NoteStackSkeleton";
import { TearSheet } from "@/components/workspace/TearSheet";
import { ReturnSheet } from "@/components/workspace/ReturnSheet";
import { NoteEditor } from "@/components/workspace/NoteEditor";
import { WorkspaceState } from "@/components/workspace/WorkspaceState";
import "./Workspace.css";

const isSort = (v: string): v is SortKey => v === "newest" || v === "oldest" || v === "title";

const rectOf = (sel: string): DOMRect | undefined => {
  const r = document.querySelector(sel)?.getBoundingClientRect();
  return r && r.width > 0 ? r : undefined;
};
const esc = (v: string) =>
  typeof CSS !== "undefined" && CSS.escape ? CSS.escape(v) : v.replace(/"/g, '\\"');
const noteRect = (id: string) => rectOf(`[data-note-id="${esc(id)}"]`);

interface TearState {
  from: DOMRect;
  note: Note;
  to: DOMRect;
}
interface ReturnState {
  from: DOMRect;
  to: DOMRect;
  note: Note;
}
interface EditState {
  note: Note;
  from: DOMRect;
}

export default function Workspace() {
  const { notes, status, getNotes, editNote, deleteNote } = useNotes();
  const toast = useToast();
  const reduce = useReducedMotion();

  useEffect(() => {
    void getNotes();
  }, [getNotes]);

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sort, setSort] = usePersistentState<SortKey>("cloudbook:notes-sort", "newest", isSort);
  const [tag, setTag] = useState("all");
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tear, setTear] = useState<TearState | null>(null);
  const [ret, setRet] = useState<ReturnState | null>(null);
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const [arrivedId, setArrivedId] = useState<string | null>(null);

  const tags = useMemo(() => deriveTags(notes), [notes]);
  const visible = useMemo(
    () => queryNotes(notes, { search: deferredSearch, tag, sort }),
    [notes, deferredSearch, tag, sort],
  );
  const isFiltering = deferredSearch.trim() !== "" || tag !== "all";

  const clearFilters = () => {
    setSearch("");
    setTag("all");
  };

  const focusComposer = () => document.getElementById("composer-title")?.focus();

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  // --- Create: optimistic. The note is already in the list; play the tear. ---
  const handleCreated = useCallback(
    (note: Note, fromRect: DOMRect) => {
      if (reduce || fromRect.width === 0) return;
      setHiddenId(note._id);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const to = noteRect(note._id);
          if (to) setTear({ from: fromRect, note, to });
          else setHiddenId(null);
        }),
      );
    },
    [reduce],
  );

  const handleTearDone = useCallback(() => {
    const id = tear?.note._id ?? null;
    setTear(null);
    setHiddenId(null);
    setArrivedId(id);
    window.setTimeout(() => setArrivedId((cur) => (cur === id ? null : cur)), 500);
  }, [tear]);

  // --- Delete: optimistic. Fly the page back into the diary, remove now. ---
  const handleDelete = useCallback(
    (note: Note) => {
      const from = noteRect(note._id);
      const to = rectOf(".diary__written");
      if (openId === note._id) setOpenId(null);

      if (!reduce && from && to) {
        setDeletingId(note._id);
        setRet({ from, to, note });
      }

      const { committed } = deleteNote(note._id);
      committed.catch((err) =>
        toast.error(err instanceof Error ? err.message : "Couldn't delete — the note is back"),
      );
    },
    [reduce, openId, deleteNote, toast],
  );

  const handleReturnDone = useCallback(() => {
    setRet(null);
    setDeletingId(null);
  }, []);

  // --- Edit: the card unfolds into a full notebook page. ---
  const openEditor = useCallback((note: Note) => {
    const from = noteRect(note._id) ?? new DOMRect(0, 0, 0, 0);
    setEditState({ note, from });
  }, []);

  // Optimistic edit — the card updates now; NoteEditor folds itself away after.
  const handleSave = useCallback(
    (id: string, title: string, description: string, tagValue: string) => {
      const { committed } = editNote(id, title, description, tagValue);
      committed.catch((err) =>
        toast.error(err instanceof Error ? err.message : "Couldn't save — your last change was kept"),
      );
    },
    [editNote, toast],
  );

  const loading = status === "loading" && notes.length === 0;
  const loadError = status === "error" && notes.length === 0;

  return (
    <div className="workspace">
      <div className="workspace__head">
        <WorkspaceHeader total={notes.length} shown={visible.length} filtered={isFiltering} />
        {notes.length > 0 && (
          <NoteToolbar
            search={search}
            onSearch={setSearch}
            sort={sort}
            onSort={setSort}
            tags={tags}
            activeTag={tag}
            onTag={setTag}
          />
        )}
      </div>

      <div className="workspace__desk">
        <div className="workspace__diary">
          <Notebook onCreated={handleCreated} />
        </div>

        <div className="workspace__board">
          {loading && <NoteStackSkeleton />}

          {loadError && (
            <WorkspaceState
              icon="alert-triangle"
              tone="error"
              title="Couldn't reach your notes"
              body="Something went wrong loading your desk. Check your connection and try again."
              action={{ label: "Try again", onClick: () => void getNotes() }}
            />
          )}

          {!loading && !loadError && status !== "loading" && notes.length === 0 && (
            <WorkspaceState
              icon="note"
              title="Your desk is clear."
              body="Start by writing in the diary — tear the page out and it lands here."
              action={{ label: "Start writing", onClick: focusComposer }}
            />
          )}

          {!loading && notes.length > 0 && visible.length === 0 && (
            <WorkspaceState
              icon="search"
              title="No notes match"
              body="Nothing on your desk fits that search or tag. Try a different term, or clear the filters."
              action={{ label: "Clear filters", onClick: clearFilters }}
            />
          )}

          {visible.length > 0 && (
            <NoteStack
              notes={visible}
              openId={openId}
              onToggle={(id) => setOpenId((cur) => (cur === id ? null : id))}
              onEdit={openEditor}
              onDelete={handleDelete}
              deletingId={deletingId}
              hiddenId={hiddenId}
              arrivedId={arrivedId}
            />
          )}
        </div>
      </div>

      {tear && (
        <TearSheet from={tear.from} to={tear.to} note={tear.note} onDone={handleTearDone} />
      )}

      {ret && (
        <ReturnSheet from={ret.from} to={ret.to} note={ret.note} onDone={handleReturnDone} />
      )}

      {editState && (
        <NoteEditor
          note={editState.note}
          from={editState.from}
          onClose={() => setEditState(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
