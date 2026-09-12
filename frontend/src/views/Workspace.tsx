import { useEffect, useMemo, useRef, useState, useDeferredValue, useCallback } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import type { Note } from "@shared/types";
import { useNotes } from "@/context/NotesContext";
import { useToast } from "@/context/ToastContext";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { deriveTags, queryNotes, type SortKey } from "@/lib/notesQuery";
import { noteEl, noteSlotPose, poseRect, type SlotPose } from "@/lib/noteGeometry";
import { pageTurn } from "@/utils/motion";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { NoteToolbar } from "@/components/workspace/NoteToolbar";
import { NoteToolbarSkeleton } from "@/components/workspace/NoteToolbarSkeleton";
import { Notebook } from "@/components/workspace/Notebook";
import { NoteStack } from "@/components/workspace/NoteStack";
import { NoteStackSkeleton } from "@/components/workspace/NoteStackSkeleton";
import { TearSheet } from "@/components/workspace/TearSheet";
import { ReturnSheet } from "@/components/workspace/ReturnSheet";
import { NoteEditor } from "@/components/workspace/NoteEditor";
import { WorkspaceState } from "@/components/workspace/WorkspaceState";
import "./Workspace.css";

const isSort = (v: string): v is SortKey => v === "newest" || v === "oldest" || v === "title";

/** A brief moment of recognition — "this is the note I selected" — between
 *  Home settling and the note expanding into the editor. Subtle, not flashy. */
const HIGHLIGHT_MS = 280;

const rectOf = (sel: string): DOMRect | undefined => {
  const r = document.querySelector(sel)?.getBoundingClientRect();
  return r && r.width > 0 ? r : undefined;
};

interface TearState {
  from: DOMRect;
  note: Note;
  to: SlotPose;
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
  const { notes, status, error, getNotes, refreshIfStale, editNote, deleteNote } = useNotes();
  const toast = useToast();
  const reduce = useReducedMotion();

  // Load the collection whenever the store has not loaded it yet.
  //
  // Two triggers, both idempotent (getNotes joins any in-flight request):
  //  - on every mount, unless the store is already "ready" — so returning to
  //    Home retries a first attempt that failed or was lost to a teardown
  //    while the opening animation played. This is what makes the very first
  //    Home visit behave identically to visiting Home after switching sections.
  //  - on `status` becoming "idle" after mount — covers a transient provider
  //    reset that lands the store back at idle mid-session.
  //  - and, when the store IS already "ready", a background refresh if the
  //    cached list is stale — the notes stay on screen, no skeleton, the list
  //    quietly reconciles.
  useEffect(() => {
    if (status !== "ready") void getNotes();
    else refreshIfStale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (status === "idle") void getNotes();
  }, [status, getNotes]);

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
  // The slot is suppressed *before* the sheet is in the air and stays suppressed
  // until it lands, so there is only ever one sheet on screen. Its destination
  // is read from layout (noteSlotPose), which is already final even while the
  // rest of the pile is still gliding over to make room.
  const handleCreated = useCallback(
    (note: Note, fromRect: DOMRect) => {
      if (reduce || fromRect.width === 0) return;
      setHiddenId(note._id);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const to = noteSlotPose(note._id);
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
    // `arrived` makes the reveal instant (duration 0). The sheet already flew
    // the distance; the card must not re-play an entrance on top of it.
    setArrivedId(id);
    window.setTimeout(() => setArrivedId((cur) => (cur === id ? null : cur)), 500);
  }, [tear]);

  // --- Delete: the sheet is carried back into the diary and absorbed. ---
  // The row is NOT removed from the store while the sheet is in the air: the
  // slot stays (suppressed) for the whole flight, so the rest of the pile holds
  // still and the sheet has an unambiguous place it is leaving from. The store
  // mutation — and with it the reflow — happens once the paper is gone.
  const commitDelete = useCallback(
    (note: Note) => {
      const { committed } = deleteNote(note._id);
      committed.catch((err) =>
        toast.error(err instanceof Error ? err.message : "Couldn't delete — the note is back"),
      );
    },
    [deleteNote, toast],
  );
  // Mirrors of the in-flight deletion + committer, so the unmount guard below
  // can flush without re-running every time either identity changes.
  const flightRef = useRef<Note | null>(null);
  flightRef.current = ret?.note ?? null;
  const commitRef = useRef(commitDelete);
  commitRef.current = commitDelete;

  // Leaving the workspace mid-flight must not lose the deletion.
  useEffect(
    () => () => {
      if (flightRef.current) commitRef.current(flightRef.current);
    },
    [],
  );

  const handleDelete = useCallback(
    (note: Note) => {
      const from = noteSlotPose(note._id);
      const to = rectOf(".diary__written");
      if (openId === note._id) setOpenId(null);
      // A second delete while one is still travelling: land the first one now.
      if (flightRef.current && flightRef.current._id !== note._id) {
        commitDelete(flightRef.current);
        flightRef.current = null;
      }

      if (!reduce && from && to) {
        setDeletingId(note._id);
        setHiddenId(note._id);
        setRet({ from: poseRect(from), to, note });
        return;
      }
      commitDelete(note);
    },
    [reduce, openId, commitDelete],
  );

  const handleReturnDone = useCallback(() => {
    const note = flightRef.current;
    flightRef.current = null;
    setRet(null);
    setDeletingId(null);
    setHiddenId(null);
    if (note) commitDelete(note);
  }, [commitDelete]);

  // --- Edit: the card unfolds into a full notebook page. ---
  // The page starts life laid exactly over the card and the editor tells us
  // when to suppress it, so there is never a second copy of the sheet on
  // screen — and never a gap where neither is.
  const openEditor = useCallback((note: Note) => {
    const pose = noteSlotPose(note._id);
    setEditState({ note, from: pose ? poseRect(pose) : new DOMRect(0, 0, 0, 0) });
  }, []);

  // A note briefly emphasized right before it opens — the "this is the one I
  // selected" beat between Home settling and the editor unfold. Not a second
  // note-opening system: it only ever leads into the one `openEditor` above.
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Arriving here with "open this note" intent — e.g. tapping a Recent
  // Thought on the Profile page, which routes here via `transitionTo` (the
  // same page-turn leaf every section navigation uses — no separate
  // transition was invented for this). Home mounts immediately underneath
  // that leaf, so by the time the ~1s fold finishes it has already had the
  // whole turn to fetch/measure/settle — nothing left to do here but wait for
  // it. Once it's done: a brief highlight on the selected card (a moment of
  // recognition), then the exact same unfold every other entry point uses.
  // Reduced motion (`transitionTo` itself already skips the leaf then) skips
  // the wait and the highlight too — it opens immediately, logic intact.
  // The location state is cleared right away so a later back/forward or
  // reload never reopens it.
  const location = useLocation();
  const navigate = useNavigate();
  // StrictMode double-invokes this effect on every render in dev, with the
  // *same* `location.state` object both times — guard on object identity so
  // the throwaway re-invocation (sharing the reference already handled) is a
  // no-op, while a genuine later open (a fresh state object) still fires.
  const handledState = useRef<unknown>(null);
  useEffect(() => {
    const openNoteId = (location.state as { openNoteId?: string } | null)?.openNoteId;
    if (!openNoteId || status !== "ready" || handledState.current === location.state) return;
    handledState.current = location.state;
    const note = notes.find((n) => n._id === openNoteId);
    navigate(location.pathname, { replace: true, state: null });
    if (!note) return;

    const settle = () =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (reduce) {
            openEditor(note);
            return;
          }
          noteEl(note._id)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
          setHighlightId(note._id);
          window.setTimeout(() => {
            setHighlightId(null);
            openEditor(note);
          }, HIGHLIGHT_MS);
        }),
      );

    if (reduce) settle();
    else window.setTimeout(settle, pageTurn.durationMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, status, notes, reduce]);

  const occupyCard = useCallback((id: string, occupied: boolean) => {
    if (occupied) {
      setHiddenId(id);
      return;
    }
    setHiddenId((cur) => (cur === id ? null : cur));
    // instant reveal — the page already travelled the distance for it
    setArrivedId(id);
    window.setTimeout(() => setArrivedId((cur) => (cur === id ? null : cur)), 500);
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

  // One board state at a time, in priority order:
  //  - "loading": first load with nothing cached yet (idle or loading). Once
  //    notes exist they stay on screen through any later background refresh.
  //  - "error": the load failed and there is nothing to fall back to.
  //  - "empty": the collection really is empty (status ready).
  //  - "no-match": there are notes, but the search / tag filter hides them all.
  //  - "ready": show the pile.
  const boardState =
    status === "error" && notes.length === 0
      ? "error"
      : notes.length === 0 && status !== "ready"
        ? "loading"
        : notes.length === 0
          ? "empty"
          : visible.length === 0
            ? "no-match"
            : "ready";
  // Crossfade only across the load boundary; empty / no-match / ready swap
  // instantly (that is filter interaction, not loading).
  const boardPhase = boardState === "loading" || boardState === "error" ? boardState : "loaded";
  const showToolbar = notes.length > 0 || boardState === "loading";

  return (
    <div className="workspace">
      <div className="workspace__head">
        <WorkspaceHeader
          total={notes.length}
          shown={visible.length}
          filtered={isFiltering}
          loading={boardState === "loading"}
          syncing={status === "refreshing"}
          stale={status === "error" && notes.length > 0}
        />
        {showToolbar &&
          (notes.length > 0 ? (
            <NoteToolbar
              search={search}
              onSearch={setSearch}
              sort={sort}
              onSort={setSort}
              tags={tags}
              activeTag={tag}
              onTag={setTag}
            />
          ) : (
            <NoteToolbarSkeleton />
          ))}
      </div>

      <div className="workspace__desk">
        <div className="workspace__diary">
          <Notebook onCreated={handleCreated} />
        </div>

        <div className="workspace__board" data-board={boardState}>
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={boardPhase}
              className="workspace__board-swap"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.18, ease: [0.4, 0, 0.2, 1] }}
            >
              {boardState === "loading" && <NoteStackSkeleton />}

              {boardState === "error" && (
                <WorkspaceState
                  icon="alert-triangle"
                  tone="error"
                  title="Couldn't reach your notes"
                  body={
                    error ??
                    "Something went wrong loading your desk. Check your connection and try again."
                  }
                  action={{ label: "Try again", onClick: () => void getNotes() }}
                />
              )}

              {boardState === "empty" && (
                <WorkspaceState
                  icon="note"
                  title="Your desk is clear."
                  body="Start by writing in the diary — tear the page out and it lands here."
                  action={{ label: "Start writing", onClick: focusComposer }}
                />
              )}

              {boardState === "no-match" && (
                <WorkspaceState
                  icon="search"
                  title="No notes match"
                  body="Nothing on your desk fits that search or tag. Try a different term, or clear the filters."
                  action={{ label: "Clear filters", onClick: clearFilters }}
                />
              )}

              {boardState === "ready" && (
                <NoteStack
                  notes={visible}
                  openId={openId}
                  onToggle={(id) => setOpenId((cur) => (cur === id ? null : id))}
                  onEdit={openEditor}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                  hiddenId={hiddenId}
                  arrivedId={arrivedId}
                  highlightId={highlightId}
                />
              )}
            </m.div>
          </AnimatePresence>
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
          // the editor owns the card while the page stands in for it
          onOccupyCard={(occupied) => occupyCard(editState.note._id, occupied)}
          onClose={() => setEditState(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
