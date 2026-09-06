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

const escId = (v: string) =>
  typeof window !== "undefined" && window.CSS?.escape ? window.CSS.escape(v) : v;

/** The close fold — a single tuned tween so every geometry channel arrives at
 *  the card in the same frame. Not a reversed open: soft in, controlled glide,
 *  soft settle, no bounce. */
const CLOSE_MS = 520;
const CLOSE_EASE: [number, number, number, number] = [0.32, 0, 0.24, 1];

/**
 * Opening a note does not summon a dialog — the little torn card *becomes* a
 * full notebook page. It unfolds out of the card's own rect (transform only)
 * and lands as the same ruled paper the diary uses.
 *
 * Closing is the true inverse: the same sheet contracts, folds and travels back
 * onto the *live* card rect (re-measured now — an optimistic edit, a sort or a
 * resize may have moved it) as one continuous transform. The page stays fully
 * opaque the whole way; the real card is already sitting underneath, so when
 * the page reaches card geometry and unmounts there is nothing to fade — the
 * handoff is a no-op. Save / Discard / Close / Escape / scrim all run it.
 */
export function NoteEditor({ note, from, onClose, onSave }: NoteEditorProps) {
  const reduce = useReducedMotion();
  const [form, setForm] = useState({
    title: note.title,
    description: note.description,
    tag: note.tag,
  });
  const [closing, setClosing] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  const invalid = form.title.trim().length < 3 || form.description.trim().length < 3;
  const dirty =
    form.title !== note.title || form.description !== note.description || form.tag !== note.tag;

  // The uniform transform that makes the centred page overlay a card rect — the
  // open pose. (Close computes its own non-uniform pose against the live card.)
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
  // scaleX / scaleY move independently on close so notebook-page proportions
  // (tall) morph back into note-card proportions (short) as it shrinks.
  const sx = useMotionValue(reduce ? 1 : start.scale);
  const sy = useMotionValue(reduce ? 1 : start.scale);
  const skewX = useMotionValue(0);
  const rotate = useMotionValue(0);
  const pageOpacity = useMotionValue(reduce ? 0 : 0.55);
  const scrim = useMotionValue(0);

  // Unfold on mount (unchanged — the open animation is not part of this task).
  useEffect(() => {
    if (reduce) {
      pageOpacity.set(1);
      scrim.set(1);
      return;
    }
    const spring = { type: "spring", stiffness: 300, damping: 30, mass: 0.9 } as const;
    animate(x, 0, spring);
    animate(y, 0, spring);
    animate(sx, 1, spring);
    animate(sy, 1, spring);
    animate(pageOpacity, 1, { duration: 0.16 });
    animate(scrim, 1, { duration: 0.22 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fold the page back onto the card. `then` runs at the instant the geometry
   * lands, which is also the instant the editor unmounts — the card underneath
   * takes over with no fade and no swap frame.
   */
  const foldAway = (then: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    if (reduce) {
      then();
      return;
    }

    // Re-measure the live card *now* — the pile may have moved while the editor
    // was open. Fall back to the open rect only if it has genuinely vanished.
    const el =
      typeof document !== "undefined"
        ? (document.querySelector(`[data-note-id="${escId(note._id)}"]`) as HTMLElement | null)
        : null;
    const page = pageRef.current;
    const W0 = page?.offsetWidth || Math.min(640, window.innerWidth * 0.92);
    const H0 = page?.offsetHeight || W0 * 0.85;

    let target: { x: number; y: number; sx: number; sy: number; rotate: number };
    const live = el?.getBoundingClientRect();
    if (el && live && live.width > 0) {
      // AABB centre is rotation-invariant; offset size is the true card box.
      const cardW = el.offsetWidth || live.width;
      const cardH = el.offsetHeight || live.height;
      target = {
        x: live.left + live.width / 2 - window.innerWidth / 2,
        y: live.top + live.height / 2 - window.innerHeight / 2,
        sx: Math.max(0.05, cardW / W0),
        sy: Math.max(0.05, cardH / H0),
        rotate: parseFloat(getComputedStyle(el).rotate) || 0,
      };
    } else {
      target = { x: start.x, y: start.y, sx: start.scale, sy: start.scale, rotate: 0 };
    }

    const t = { duration: CLOSE_MS / 1000, ease: CLOSE_EASE } as const;
    // One tween, one clock — position, both scales and rotation land together.
    const done = Promise.all([
      animate(x, target.x, t),
      animate(y, target.y, t),
      animate(sx, target.sx, t),
      // sy dips a hair past target then settles — the paper compressing shut.
      animate(sy, [sy.get(), target.sy * 0.985, target.sy], { ...t, times: [0, 0.72, 1] }),
      animate(rotate, target.rotate, t),
    ]);
    // A brief bend early on, released back flat — reads as a fold, not a spin.
    animate(skewX, [0, -2.4, -0.7, 0], {
      duration: CLOSE_MS / 1000,
      times: [0, 0.26, 0.62, 1],
      ease: "easeInOut",
    });
    // Backdrop clears on the same clock; the page itself never fades.
    animate(scrim, 0, { duration: (CLOSE_MS / 1000) * 0.92 });
    done.then(then);
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
      data-closing={closing || undefined}
      style={{ "--scrim-o": scrim } as React.CSSProperties}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) foldAway(onClose);
      }}
    >
      <m.div
        ref={pageRef}
        className="note-editor__page diary__page"
        style={{
          x,
          y,
          scaleX: sx,
          scaleY: sy,
          skewX,
          rotate,
          opacity: pageOpacity,
          transformOrigin: "center",
        }}
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
