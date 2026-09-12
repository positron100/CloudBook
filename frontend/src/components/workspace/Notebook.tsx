import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { Note } from "@shared/types";
import { useNotes } from "@/context/NotesContext";
import { useToast } from "@/context/ToastContext";
import { Icon } from "@/components/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTypingPreview } from "@/hooks/useTypingPreview";
import { DEFAULT_TAG } from "@/lib/tags";
import { TagSelect } from "./TagSelect";
import "./Notebook.css";

const EMPTY = { title: "", description: "", tag: "" };

const TITLE_PREVIEW = "Weekend plans";
const BODY_PREVIEW = "Hike Saturday morning, farmers market after, call mum in the evening…";

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
  const reduce = useReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);
  const writtenRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(EMPTY);
  // A brief "the page was pulled" give on the notebook itself as the sheet leaves.
  const [tearing, setTearing] = useState(false);

  // The same ghost typing-preview as the Contact letter's WrittenLine fields —
  // an example, typed out over the empty field on hover/focus, gone the
  // instant a real character is typed. Two independent instances (title,
  // body) so a preview on one field never plays if you're in the other.
  const [titleActive, setTitleActive] = useState(false);
  const [bodyActive, setBodyActive] = useState(false);
  const titlePreviewOn = !draft.title && !reduce && titleActive;
  const bodyPreviewOn = !draft.description && !reduce && bodyActive;
  const titlePreview = useTypingPreview(TITLE_PREVIEW, titlePreviewOn);
  const bodyPreview = useTypingPreview(BODY_PREVIEW, bodyPreviewOn);

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
      tag: draft.tag.trim() || DEFAULT_TAG,
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
        <span className="diary__binding ring-binding" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="ring-binding__ring" />
          ))}
        </span>

        <div className="diary__written" ref={writtenRef}>
          <label className="sr-only" htmlFor="composer-title">
            Title
          </label>
          <span
            className="diary__field"
            onMouseEnter={() => setTitleActive(true)}
            onMouseLeave={() => setTitleActive(false)}
          >
            <input
              id="composer-title"
              name="title"
              className="diary__title"
              placeholder={titlePreviewOn ? "" : "Untitled"}
              value={draft.title}
              onChange={onChange}
              onFocus={() => setTitleActive(true)}
              onBlur={() => setTitleActive(false)}
              autoComplete="off"
              required
              minLength={3}
            />
            {titlePreview && (
              <span className="diary__preview diary__preview--title" aria-hidden="true">
                {titlePreview}
                <span className="diary__caret" />
              </span>
            )}
          </span>

          <label className="sr-only" htmlFor="composer-body">
            Note
          </label>
          <span
            className="diary__field diary__field--body"
            onMouseEnter={() => setBodyActive(true)}
            onMouseLeave={() => setBodyActive(false)}
          >
            <textarea
              id="composer-body"
              name="description"
              className="diary__body"
              placeholder={bodyPreviewOn ? "" : "Start writing…"}
              value={draft.description}
              onChange={onChange}
              onFocus={() => setBodyActive(true)}
              onBlur={() => setBodyActive(false)}
              required
              minLength={3}
            />
            {bodyPreview && (
              <span className="diary__preview diary__preview--body" aria-hidden="true">
                {bodyPreview}
                <span className="diary__caret" />
              </span>
            )}
          </span>
        </div>

        <div className="diary__margin">
          <span className="sr-only" id="composer-tag-label">
            Tag
          </span>
          <TagSelect
            id="composer-tag"
            label="Tag"
            value={draft.tag}
            onChange={(tag) => setDraft((d) => ({ ...d, tag }))}
          />
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
