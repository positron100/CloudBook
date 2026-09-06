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
import { WorkspaceState } from "@/components/workspace/WorkspaceState";
import { NoteEditModal } from "@/components/workspace/NoteEditModal";
import "./Workspace.css";

const isSort = (v: string): v is SortKey => v === "newest" || v === "oldest" || v === "title";

interface TearState {
  from: DOMRect;
  note: Note;
  to: DOMRect;
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
  const [editing, setEditing] = useState<Note | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tear, setTear] = useState<TearState | null>(null);
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

  // Close an open note on Escape.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  const handleCreated = useCallback(
    (note: Note, fromRect: DOMRect) => {
      const canAnimate = !reduce && fromRect.width > 0 && fromRect.height > 0;
      if (!canAnimate) {
        toast.success("Note added to your desk");
        return;
      }
      setHiddenId(note._id);
      // Let the suppressed slot render, then measure where it landed.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.querySelector<HTMLElement>(`[data-note-id="${note._id}"]`);
          const to = el?.getBoundingClientRect();
          if (to && to.width > 0) {
            setTear({ from: fromRect, note, to });
          } else {
            setHiddenId(null);
            toast.success("Note added to your desk");
          }
        });
      });
    },
    [reduce, toast],
  );

  const handleTearDone = useCallback(() => {
    const id = tear?.note._id ?? null;
    setTear(null);
    setHiddenId(null);
    setArrivedId(id);
    toast.success("Note added to your desk");
    window.setTimeout(() => setArrivedId((cur) => (cur === id ? null : cur)), 500);
  }, [tear, toast]);

  const handleDelete = async (note: Note) => {
    setDeletingId(note._id);
    if (openId === note._id) setOpenId(null);
    try {
      await deleteNote(note._id);
      toast.warning("Note removed from your desk");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete note");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async (id: string, title: string, description: string, tagValue: string) => {
    try {
      await editNote(id, title, description, tagValue);
      setEditing(null);
      toast.success("Note updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update note");
    }
  };

  // Persistent load error with nothing to show — keep the desk chrome around it.
  if (status === "error" && notes.length === 0) {
    return (
      <div className="workspace">
        <header className="ws-header">
          <h1 className="ws-header__title">Your desk</h1>
        </header>
        <div className="workspace__desk">
          <WorkspaceState
            icon="alert-triangle"
            tone="error"
            title="Couldn't reach your notes"
            body="Something went wrong loading your desk. Check your connection and try again."
            action={{ label: "Try again", onClick: () => void getNotes() }}
          />
        </div>
      </div>
    );
  }

  const loading = status === "loading" && notes.length === 0;

  return (
    <div className="workspace">
      <WorkspaceHeader total={notes.length} shown={visible.length} filtered={isFiltering} />

      <Notebook onCreated={handleCreated} />

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

      <div className="workspace__desk">
        {loading && <NoteStackSkeleton />}

        {!loading && status === "ready" && notes.length === 0 && (
          <WorkspaceState
            icon="note"
            title="Your desk is clear."
            body="Write something worth keeping — it lands here as a fresh sheet."
            action={{ label: "Start a note", onClick: focusComposer }}
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
            onEdit={setEditing}
            onDelete={handleDelete}
            deletingId={deletingId}
            hiddenId={hiddenId}
            arrivedId={arrivedId}
          />
        )}
      </div>

      {tear && (
        <TearSheet
          from={tear.from}
          to={tear.to}
          title={tear.note.title}
          body={tear.note.description}
          onDone={handleTearDone}
        />
      )}

      <NoteEditModal note={editing} onClose={() => setEditing(null)} onSave={handleSave} />
    </div>
  );
}
