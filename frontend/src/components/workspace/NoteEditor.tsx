import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, m } from "framer-motion";
import type { Note } from "@shared/types";
import { Icon } from "@/components/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import "./NoteEditor.css";

interface NoteEditorProps {
  note: Note;
  /** The card's on-screen rect — the page unfolds out of it. */
  from: DOMRect;
  onClose: () => void;
  onSave: (id: string, title: string, description: string, tag: string) => void;
}

/**
 * Opening a note does not summon a dialog — the little torn page *becomes* a
 * full notebook page. It unfolds out of the card's own rect (transform only,
 * no layout animation), lands as the same ruled paper the diary uses, and
 * folds back into the card on close. Native inputs throughout.
 */
export function NoteEditor({ note, from, onClose, onSave }: NoteEditorProps) {
  const reduce = useReducedMotion();
  const [form, setForm] = useState({
    title: note.title,
    description: note.description,
    tag: note.tag,
  });
  const titleRef = useRef<HTMLInputElement>(null);

  const invalid = form.title.trim().length < 3 || form.description.trim().length < 3;
  const dirty =
    form.title !== note.title || form.description !== note.description || form.tag !== note.tag;

  // Where the page starts: overlaying the card, scaled down to its width.
  const start = useMemo(() => {
    if (typeof window === "undefined" || from.width === 0) {
      return { x: 0, y: 0, scale: 0.9 };
    }
    const pageW = Math.min(640, window.innerWidth * 0.92);
    return {
      x: from.left + from.width / 2 - window.innerWidth / 2,
      y: from.top + from.height / 2 - window.innerHeight / 2,
      scale: Math.max(0.2, from.width / pageW),
    };
  }, [from]);

  useEffect(() => {
    const id = window.setTimeout(() => titleRef.current?.focus(), reduce ? 0 : 220);
    return () => window.clearTimeout(id);
  }, [reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const save = () => {
    if (invalid) return;
    onSave(note._id, form.title.trim(), form.description.trim(), form.tag.trim() || "General");
  };

  return (
    <AnimatePresence>
      <m.div
        className="note-editor"
        role="dialog"
        aria-modal="true"
        aria-label={`Edit note: ${note.title}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <m.div
          className="note-editor__page diary__page"
          initial={reduce ? { opacity: 0 } : { ...start, opacity: 0.5 }}
          animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { ...start, opacity: 0 }}
          transition={
            reduce
              ? { duration: 0.14 }
              : { type: "spring", stiffness: 320, damping: 32, mass: 0.9, opacity: { duration: 0.18 } }
          }
        >
          <span className="diary__binding" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="diary__ring" />
            ))}
          </span>

          <label className="sr-only" htmlFor="editor-title">
            Title
          </label>
          <input
            ref={titleRef}
            id="editor-title"
            name="title"
            className="diary__title"
            placeholder="Untitled"
            value={form.title}
            onChange={onChange}
            autoComplete="off"
          />

          <label className="sr-only" htmlFor="editor-body">
            Note
          </label>
          <textarea
            id="editor-body"
            name="description"
            className="diary__body note-editor__body"
            placeholder="Write it down…"
            value={form.description}
            onChange={onChange}
          />

          <div className="note-editor__foot">
            <span className="diary__tag-field">
              <Icon name="sparkle" size={13} className="diary__tag-icon" />
              <label className="sr-only" htmlFor="editor-tag">
                Tag
              </label>
              <input
                id="editor-tag"
                name="tag"
                className="diary__tag-input"
                placeholder="Add a tag"
                value={form.tag}
                onChange={onChange}
                autoComplete="off"
              />
            </span>

            <span className="note-editor__actions">
              <button type="button" className="note-editor__cancel" onClick={onClose}>
                {dirty ? "Discard" : "Close"}
              </button>
              <button
                type="button"
                className="note-editor__save"
                onClick={save}
                disabled={invalid || !dirty}
              >
                Save changes
              </button>
            </span>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
