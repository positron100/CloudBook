import { useEffect, useMemo, useState, useDeferredValue } from "react";
import type { Note } from "@shared/types";
import { FadePresence } from "@/components/motion";
import { useNotes } from "@/context/NotesContext";
import { useToast } from "@/context/ToastContext";
import { usePersistentState } from "@/hooks/usePersistentState";
import { deriveTags, queryNotes, type SortKey } from "@/lib/notesQuery";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { NoteToolbar, type ViewMode } from "@/components/workspace/NoteToolbar";
import { NoteComposer } from "@/components/workspace/NoteComposer";
import { NoteCollection } from "@/components/workspace/NoteCollection";
import { NoteSkeletonGrid } from "@/components/workspace/NoteSkeletonGrid";
import { WorkspaceState } from "@/components/workspace/WorkspaceState";
import { NoteEditModal } from "@/components/workspace/NoteEditModal";
import "./Workspace.css";

const isView = (v: string): v is ViewMode => v === "grid" || v === "list";
const isSort = (v: string): v is SortKey => v === "newest" || v === "oldest" || v === "title";

export default function Workspace() {
  const { notes, status, getNotes, editNote, deleteNote } = useNotes();
  const toast = useToast();

  useEffect(() => {
    void getNotes();
  }, [getNotes]);

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sort, setSort] = usePersistentState<SortKey>("cloudbook:notes-sort", "newest", isSort);
  const [tag, setTag] = useState("all");
  const [view, setView] = usePersistentState<ViewMode>("cloudbook:notes-view", "grid", isView);
  const [editing, setEditing] = useState<Note | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = async (note: Note) => {
    setDeletingId(note._id);
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

  // Persistent load error with nothing to show.
  if (status === "error" && notes.length === 0) {
    return (
      <div className="workspace">
        <WorkspaceState
          icon="alert-triangle"
          tone="error"
          title="Couldn't reach your notes"
          body="Something went wrong loading your desk. Check your connection and try again."
          action={{ label: "Try again", onClick: () => void getNotes() }}
        />
      </div>
    );
  }

  const loading = status === "loading" && notes.length === 0;

  return (
    <div className="workspace">
      <WorkspaceHeader total={notes.length} shown={visible.length} filtered={isFiltering} />

      <div className="workspace__layout">
        <div className="workspace__rail">
          <NoteComposer />
        </div>

        <div className="workspace__main">
          {notes.length > 0 && (
            <NoteToolbar
              search={search}
              onSearch={setSearch}
              sort={sort}
              onSort={setSort}
              tags={tags}
              activeTag={tag}
              onTag={setTag}
              view={view}
              onView={setView}
            />
          )}

          {loading && <NoteSkeletonGrid view={view} />}

          {!loading && status === "ready" && notes.length === 0 && (
            <WorkspaceState
              icon="note"
              title="Your desk is clear"
              body="Nothing here yet. Jot down the first thing on your mind and it'll appear right here."
              action={{ label: "Write your first note", onClick: focusComposer }}
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
            <FadePresence transitionKey={`${view}-${sort}-${tag}`} y={6}>
              <NoteCollection
                notes={visible}
                view={view}
                onEdit={setEditing}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
            </FadePresence>
          )}
        </div>
      </div>

      <NoteEditModal note={editing} onClose={() => setEditing(null)} onSave={handleSave} />
    </div>
  );
}
