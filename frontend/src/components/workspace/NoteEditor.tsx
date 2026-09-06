import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { m, useMotionValue, animate } from "framer-motion";
import type { Note } from "@shared/types";
import { Icon } from "@/components/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import "./NoteEditor.css";

interface NoteEditorProps {
  note: Note;
  /** The card's on-screen rect — the page unfolds out of it and folds back. */
  from: DOMRect;
  onClose: () => void;
  onSave: (id: string, title: string, description: string, tag: string) => void;
}

/**
 * Opening a note does not summon a dialog — the little torn card *becomes* a
 * full notebook page. It unfolds out of the card's own rect (transform only),
 * lands as the same ruled paper the diary uses, and on Save or Discard folds
 * back down into that exact card position before it unmounts. Native inputs.
 */
export function NoteEditor({ note, from, onClose, onSave }: NoteEditorProps) {
  const reduce = useReducedMotion();
  const [form, setForm] = useState({
    title: note.title,
    description: note.description,
    tag: note.tag,
  });
  const titleRef = useRef<HTMLInputElement>(null);
  const closingRef = useRef(false);

  const invalid = form.title.trim().length < 3 || form.description.trim().length < 3;
  const dirty =
    form.title !== note.title || form.description !== note.description || form.tag !== note.tag;

  // The transform that makes a centred page overlay a given card rect.
  const poseFor = (r: DOMRect) => {
    if (typeof window === "undefined" || r.width === 0) return { x: 0, y: 0, scale: 0.92 };
    const pageW = Math.min(640, window.innerWidth * 0.92);
    return {
      x: r.left + r.width / 2 - window.innerWidth / 2,
      y: r.top + r.height / 2 - window.innerHeight / 2,
      scale: Math.max(0.18, r.width / pageW),
    };
  };
  const start = useMemo(() => poseFor(from), [from]);

  const x = useMotionValue(reduce ? 0 : start.x);
  const y = useMotionValue(reduce ? 0 : start.y);
  const scale = useMotionValue(reduce ? 1 : start.scale);
  const pageOpacity = useMotionValue(reduce ? 0 : 0.55);
  const scrim = useMotionValue(0);

  // Unfold on mount.
  useEffect(() => {
    if (reduce) {
      pageOpacity.set(1);
      scrim.set(1);
      return;
    }
    const spring = { type: "spring", stiffness: 300, damping: 30, mass: 0.9 } as const;
    animate(x, 0, spring);
    animate(y, 0, spring);
    animate(scale, 1, spring);
    animate(pageOpacity, 1, { duration: 0.16 });
    animate(scrim, 1, { duration: 0.22 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fold back onto the source card — re-measured now, since an optimistic edit
  // may have moved it — and hold the page opaque until it is essentially on the
  // card, so the card emerges rather than "takes over".
  const foldAway = (then: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (reduce) {
      then();
      return;
    }
    const live =
      typeof document !== "undefined"
        ? document
            .querySelector(`[data-note-id="${(window.CSS?.escape ?? String)(note._id)}"]`)
            ?.getBoundingClientRect()
        : undefined;
    const target = live && live.width > 0 ? poseFor(live) : start;
    const spring = { type: "spring", stiffness: 340, damping: 34, mass: 0.85 } as const;
    animate(x, target.x, spring);
    animate(y, target.y, spring);
    animate(scale, target.scale, spring);
    animate(pageOpacity, 0, { duration: 0.12, delay: 0.24 });
    animate(scrim, 0, { duration: 0.3 }).then(then);
  };

  useEffect(() => {
    const id = window.setTimeout(() => titleRef.current?.focus(), reduce ? 0 : 240);
    return () => window.clearTimeout(id);
  }, [reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") foldAway(onClose);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const save = () => {
    if (invalid) return;
    onSave(note._id, form.title.trim(), form.description.trim(), form.tag.trim() || "General");
    foldAway(onClose);
  };

  return (
    <m.div
      className="note-editor"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit note: ${note.title}`}
      style={{ "--scrim-o": scrim } as React.CSSProperties}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) foldAway(onClose);
      }}
    >
      <m.div
        className="note-editor__page diary__page"
        style={{ x, y, scale, opacity: pageOpacity, transformOrigin: "center" }}
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
            <button type="button" className="note-editor__cancel" onClick={() => foldAway(onClose)}>
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
  );
}
