import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { Note } from "@shared/types";
import { useNotes } from "@/context/NotesContext";
import { useToast } from "@/context/ToastContext";
import { Icon } from "@/components/ui";
import "./Notebook.css";

const EMPTY = { title: "", description: "", tag: "" };

interface NotebookProps {
  /** Fired after the API confirms — hands back the new note and the page's
   *  on-screen rect so the workspace can tear it out toward the stack. */
  onCreated: (note: Note, fromRect: DOMRect) => void;
}

/**
 * A page in a notebook, not a form. Title is written straight onto the sheet,
 * the body is a ruled writing area, the tag sits quietly in the margin. Native
 * inputs throughout — nothing is contenteditable, nothing fakes a caret.
 */
export function Notebook({ onCreated }: NotebookProps) {
  const { addNote } = useNotes();
  const toast = useToast();
  const pageRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const invalid = draft.title.trim().length < 3 || draft.description.trim().length < 3;
  const dirty = Boolean(draft.title || draft.description || draft.tag);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft({ ...draft, [e.target.name]: e.target.value });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (invalid || submitting) return;
    const fromRect = pageRef.current?.getBoundingClientRect();
    setSubmitting(true);
    try {
      const note = await addNote(
        draft.title.trim(),
        draft.description.trim(),
        draft.tag.trim() || "General",
      );
      setDraft(EMPTY);
      if (fromRect) onCreated(note, fromRect);
      else toast.success("Note added to your desk");
    } catch (err) {
      // Page stays intact and filled in — the tear never happens on failure.
      toast.error(err instanceof Error ? err.message : "Could not add note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="notebook" onSubmit={handleSubmit} aria-label="Write a note">
      <div className="notebook__page" ref={pageRef}>
        <span className="notebook__binding" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="notebook__ring" />
          ))}
        </span>

        <label className="sr-only" htmlFor="composer-title">
          Title
        </label>
        <input
          id="composer-title"
          name="title"
          className="notebook__title"
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
          className="notebook__body"
          placeholder="Start writing…"
          value={draft.description}
          onChange={onChange}
          required
          minLength={3}
          rows={4}
        />

        <div className="notebook__margin">
          <span className="notebook__tag-field">
            <Icon name="sparkle" size={14} className="notebook__tag-icon" />
            <label className="sr-only" htmlFor="composer-tag">
              Tag
            </label>
            <input
              id="composer-tag"
              name="tag"
              className="notebook__tag-input"
              placeholder="Add a tag"
              value={draft.tag}
              onChange={onChange}
              autoComplete="off"
            />
          </span>

          <span className="notebook__actions">
            {dirty && (
              <button
                type="button"
                className="notebook__clear"
                onClick={() => setDraft(EMPTY)}
              >
                Clear
              </button>
            )}
            <button type="submit" className="notebook__tear" disabled={invalid || submitting}>
              {submitting ? "Adding…" : "Add note"}
            </button>
          </span>
        </div>

        <span className="notebook__perforation" aria-hidden="true" />
      </div>
    </form>
  );
}
