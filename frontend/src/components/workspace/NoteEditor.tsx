import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { m, useMotionValue, useTransform, animate } from "framer-motion";
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

/** Close easing — soft in, controlled glide, soft settle, no bounce. Shared by
 *  every geometry channel in stage 2 so they arrive at the card together. */
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
  // Close-only: a subtle 3D bend, a deepening-then-settling shadow (`depth`),
  // and a fold seam that surfaces while the paper folds (`seam`).
  const rotateX = useMotionValue(0);
  const depth = useMotionValue(0);
  const seam = useMotionValue(0);
  // The fold crease's vertical position (%). It rides upward as the lower half
  // folds under the top during the close.
  const seamY = useMotionValue(50);
  // 0 = the diary's full spiral binding (open / at rest); 1 = the torn page's
  // punched-hole trace. Cross-faded as the page folds back to a card so the
  // binding detail *reforms* rather than popping in at the handoff.
  const bindMorph = useMotionValue(0);
  const pageOpacity = useMotionValue(reduce ? 0 : 0.55);
  const scrim = useMotionValue(0);

  // The paper deforms; the content rides more stably. Content counters the
  // paper's non-uniform squash (so text scales uniformly, never stretched) and
  // leans back against most of the skew — it reads as printed matter on a sheet
  // that is folding, not a scaled rectangle.
  const contentScaleY = useTransform([sx, sy] as [typeof sx, typeof sy], ([a, b]: number[]) =>
    b > 0.02 ? Math.min(1.3, 1 + (a / b - 1) * 0.5) : 1,
  );
  const contentSkew = useTransform(skewX, (v) => -v * 0.55);

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
   * Fold the page back onto the card as one physical transformation, in three
   * stages that flow into each other:
   *
   *   1. initiation (~130ms) — the sheet is picked up: a small lift, a slight
   *      3D bend, the shadow deepens, a fold seam surfaces. Barely smaller.
   *   2. contraction + travel (~420ms) — the dominant, smoothest stage. Width,
   *      height, x, y and rotation all resolve toward the card together; the
   *      bend releases; the shadow winds down. The paper contracts toward its
   *      upper third (transform-origin 34%) rather than zooming to its centre.
   *   3. placement (~150ms) — the page is already on the card. The seam and
   *      skew clear, the shadow settles, the card gives a 1.5px "received" dip,
   *      then the editor unmounts. The eye already reads it as the card, so the
   *      React handoff has nothing to hide — no fade, no swap frame.
   *
   * The destination is the *live* card rect, re-measured now (an optimistic
   * edit, a sort or a resize may have moved the pile).
   */
  const foldAway = (then: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    if (reduce) {
      then();
      return;
    }

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
      const syT = Math.max(0.05, cardH / H0);
      target = {
        x: live.left + live.width / 2 - window.innerWidth / 2,
        // origin sits at 34% vertically, so scaling contracts the sheet toward
        // its top edge; this term keeps the shrinking page centred on the card.
        y: live.top + live.height / 2 - window.innerHeight / 2 + 0.16 * H0 * (1 - syT),
        sx: Math.max(0.05, cardW / W0),
        sy: syT,
        rotate: parseFloat(getComputedStyle(el).rotate) || 0,
      };
    } else {
      target = { x: start.x, y: start.y, sx: start.scale, sy: start.scale, rotate: 0 };
    }

    const run = async () => {
      // Stage 1 — establish the fold plane (~150ms). Barely smaller: a small
      // lift, a 3D bend, the shadow deepens, the crease appears near mid-height.
      await Promise.all([
        animate(y, y.get() - 7, { duration: 0.13, ease: [0.3, 0, 0.3, 1] }),
        animate(sx, 1 - (1 - target.sx) * 0.07, { duration: 0.15, ease: "easeOut" }),
        animate(sy, 1 - (1 - target.sy) * 0.13, { duration: 0.15, ease: "easeOut" }),
        animate(skewX, -1.6, { duration: 0.15, ease: "easeOut" }),
        animate(rotateX, 8, { duration: 0.15, ease: "easeOut" }),
        animate(depth, 1, { duration: 0.13 }),
        animate(seam, 0.9, { duration: 0.14 }),
        animate(seamY, 43, { duration: 0.15, ease: "easeOut" }),
      ]);

      // Stage 2 — contract around the fold while travelling (~430ms). The two
      // halves compress toward the crease (rotateX tents up then flattens, the
      // seam rides upward), geometry resolves on one shared ease, and the
      // crease fades out by the end so stage 3 has nothing left to do.
      const D = 0.43;
      animate(rotateX, [rotateX.get(), 11, 0], {
        duration: D,
        times: [0, 0.32, 1],
        ease: [0.4, 0, 0.2, 1],
      });
      animate(depth, 0.12, { duration: D, ease: "easeOut" });
      animate(seam, [seam.get(), 1, 0], { duration: D, times: [0, 0.42, 1], ease: "easeInOut" });
      animate(seamY, 26, { duration: D, ease: "easeInOut" });
      animate(skewX, [-1.6, 0.5, 0.1], { duration: D, ease: "easeInOut" });
      animate(bindMorph, 1, { duration: D, ease: "easeOut" });
      animate(scrim, 0, { duration: D * 0.96 });
      await Promise.all([
        animate(x, target.x, { duration: D, ease: CLOSE_EASE }),
        animate(y, target.y, { duration: D, ease: CLOSE_EASE }),
        animate(sx, target.sx, { duration: D, ease: CLOSE_EASE }),
        animate(sy, [sy.get(), target.sy * 0.985, target.sy], {
          duration: D,
          ease: CLOSE_EASE,
          times: [0, 0.72, 1],
        }),
        animate(rotate, target.rotate, { duration: D, ease: CLOSE_EASE }),
      ]);

      // Stage 3 — the boring last 15%. The page is already the card's exact
      // size, rotation and position; it just settles. The destination card
      // gives a 1px "received" dip. Then the editor unmounts.
      if (el) {
        el.setAttribute("data-received", "");
        window.setTimeout(() => el.removeAttribute("data-received"), 320);
      }
      await Promise.all([
        animate(skewX, 0, { duration: 0.14, ease: "easeOut" }),
        animate(seam, 0, { duration: 0.1 }),
        animate(depth, 0, { duration: 0.14 }),
        animate(y, target.y, { duration: 0.14, ease: "easeOut" }),
      ]);
      then();
    };
    void run();
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
          rotateX,
          opacity: pageOpacity,
          // Centre while opening; on close (transforms are at rest the instant
          // `closing` flips, so no visual jump) the origin moves to the upper
          // third and the sheet contracts toward its top edge.
          transformOrigin: closing ? "50% 34%" : "center",
          ["--depth" as string]: depth,
          ["--seam" as string]: seam,
          ["--seam-y" as string]: seamY,
          ["--bind-morph" as string]: bindMorph,
          ["--sx" as string]: sx,
          ["--sy" as string]: sy,
        }}
      >
        <span className="diary__binding" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="diary__ring" />
          ))}
        </span>
        {/* The torn-page binding trace — hidden until the close fold reforms it. */}
        <span className="note-card__tear" aria-hidden="true" />
        <span className="note-card__binding" aria-hidden="true" />

        <m.div
          className="note-editor__content"
          style={{ scaleY: contentScaleY, skewX: contentSkew, transformOrigin: "top center" }}
        >
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
    </m.div>
  );
}
