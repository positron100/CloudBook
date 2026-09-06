import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { Note } from "@shared/types";
import { useNotes } from "@/context/NotesContext";
import { useToast } from "@/context/ToastContext";
import { Icon } from "@/components/ui";
import "./Notebook.css";

const EMPTY = { title: "", description: "", tag: "" };

interface NotebookProps {
  /** Fired the instant "Tear out" is pressed (optimistic) — hands back the
   *  provisional note and the page's on-screen rect so the workspace can tear
   *  it out toward the pile while the API runs in the background. */
  onCreated: (note: Note, fromRect: DOMRect) => void;
}

/**
 * A pocket diary standing on the left of the desk. Title written straight onto
 * the page, a ruled writing area that fills the page height, the tag in the
 * margin, and a tear tab along the bottom edge. Native inputs throughout.
 */
export function Notebook({ onCreated }: NotebookProps) {
  const { addNote } = useNotes();
  const toast = useToast();
  const pageRef = useRef<HTMLDivElement>(null);
  const writtenRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(EMPTY);
  // A brief "the page was pulled" give on the notebook itself as the sheet leaves.
  const [tearing, setTearing] = useState(false);

  const invalid = draft.title.trim().length < 3 || draft.description.trim().length < 3;

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft({ ...draft, [e.target.name]: e.target.value });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    const fromRect = writtenRef.current?.getBoundingClientRect();
    const filled = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      tag: draft.tag.trim() || "General",
    };

    // Optimistic: the note is created and the tear begins now. The API runs in
    // the background and only speaks up if it fails.
    const { note, committed } = addNote(filled.title, filled.description, filled.tag);
    setDraft(EMPTY);
    setTearing(true);
    window.setTimeout(() => setTearing(false), 420);
    if (fromRect) onCreated(note, fromRect);

    committed.catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not save note — try again");
      // Give the writer their words back so nothing is lost.
      setDraft((cur) =>
        cur.title || cur.description
          ? cur
          : { title: filled.title, description: filled.description, tag: draft.tag },
      );
    });
  };

  return (
    <form className="diary" onSubmit={handleSubmit} aria-label="Write a note">
      <div className="diary__page" ref={pageRef} data-tearing={tearing || undefined}>
        <span className="diary__binding" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="diary__ring" />
          ))}
        </span>

        <div className="diary__written" ref={writtenRef}>
          <label className="sr-only" htmlFor="composer-title">
            Title
          </label>
          <input
            id="composer-title"
            name="title"
            className="diary__title"
            placeholder="Untitled"
            value={draft.title}
            onChange={onChange}
            autoComplete="off"
            required
            minLength={3}
          />

          <label className="sr-only" htmlFor="composer-body">
            Note
          </label>
          <textarea
            id="composer-body"
            name="description"
            className="diary__body"
            placeholder="Start writing…"
            value={draft.description}
            onChange={onChange}
            required
            minLength={3}
          />
        </div>

        <div className="diary__margin">
          <span className="diary__tag-field">
            <Icon name="sparkle" size={13} className="diary__tag-icon" />
            <label className="sr-only" htmlFor="composer-tag">
              Tag
            </label>
            <input
              id="composer-tag"
              name="tag"
              className="diary__tag-input"
              placeholder="Add a tag"
              value={draft.tag}
              onChange={onChange}
              autoComplete="off"
            />
          </span>
        </div>

        <button type="submit" className="diary__tear" disabled={invalid}>
          <span className="diary__tear-edge" aria-hidden="true" />
          <span className="diary__tear-label">
            Tear out
            <Icon name="arrow-right" size={15} />
          </span>
        </button>
      </div>
    </form>
  );
}
