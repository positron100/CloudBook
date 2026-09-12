import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { m, useMotionValue, useTransform, animate } from "framer-motion";
import type { Note } from "@shared/types";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { noteEl, noteSlotPose } from "@/lib/noteGeometry";
import { DEFAULT_TAG } from "@/lib/tags";
import { DeskOverlay } from "./DeskOverlay";
import { TagSelect } from "./TagSelect";
import "./NoteEditor.css";

interface NoteEditorProps {
  note: Note;
  /** The card's settled box — the page unfolds out of it and folds back. */
  from: DOMRect;
  onClose: () => void;
  /**
   * The page and the card are the same sheet, so only one of them may be on
   * screen at a time. The editor drives that: it takes the card over once the
   * page has grown big enough to cover it (and immediately if a close starts
   * first), and hands it back the frame its geometry has resolved onto the
   * card — at which point the page cross-fades out over it. Same paper, same
   * rect, so all the eye sees is the writing resolving.
   */
  onOccupyCard?: (occupied: boolean) => void;
  onSave: (id: string, title: string, description: string, tag: string) => void;
}

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
export function NoteEditor({
  note,
  from,
  onClose,
  onOccupyCard,
  onSave,
}: NoteEditorProps) {
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

  const invalid =
    form.title.trim().length < 3 || form.description.trim().length < 3;
  const dirty =
    form.title !== note.title ||
    form.description !== note.description ||
    form.tag !== note.tag;

  /** The page's own untransformed box, measured once before the first paint.
   *  Everything is expressed against this rather than against an assumed
   *  viewport centre, so nothing depends on how the page happens to be laid
   *  out. */
  const restRef = useRef<DOMRect | null>(null);

  /** The transform that lays the page exactly over a card box — same width,
   *  same height, same centre. Non-uniform on purpose: a card is short and a
   *  page is tall, and the two must coincide *exactly* or the moment one
   *  becomes the other is visible. */
  const cardPose = (r: DOMRect) => {
    const rest = restRef.current;
    if (!rest || !rest.width || !rest.height) return { x: 0, y: 0, sx: 1, sy: 1 };
    return {
      x: r.left + r.width / 2 - (rest.left + rest.width / 2),
      y: r.top + r.height / 2 - (rest.top + rest.height / 2),
      sx: Math.max(0.05, r.width / rest.width),
      sy: Math.max(0.05, r.height / rest.height),
    };
  };

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // scaleX / scaleY move independently so notebook-page proportions (tall)
  // morph into note-card proportions (short) at both ends of the transition.
  const sx = useMotionValue(1);
  const sy = useMotionValue(1);
  const skewX = useMotionValue(0);
  const rotate = useMotionValue(0);
  // Close-only: a brief pick-up tilt and a deepening-then-settling shadow
  // (`depth`). No fold plane — the sheet stays one continuous surface.
  const rotateX = useMotionValue(0);
  const depth = useMotionValue(0);
  const pageOpacity = useMotionValue(reduce ? 1 : 0.62);
  const scrim = useMotionValue(0);
  // The writing on the sheet. It fades out over the back half of the fold so
  // the page arrives as blank paper and the card's own ink resolves in during
  // the hand-off — the alternative is watching card-sized text be squashed by
  // the page's non-uniform scale.
  const ink = useMotionValue(1);
  const occupied = useRef(false);
  const occupy = (v: boolean) => {
    if (occupied.current === v) return;
    occupied.current = v;
    onOccupyCard?.(v);
  };

  // The paper deforms; the content rides more stably. Content counters the
  // paper's non-uniform squash (so text scales uniformly, never stretched) and
  // leans back against most of the skew — it reads as printed matter on a sheet
  // that is folding, not a scaled rectangle.
  const contentScaleY = useTransform(
    [sx, sy] as [typeof sx, typeof sy],
    ([a, b]: number[]) => (b > 0.02 ? Math.min(1.3, 1 + (a / b - 1) * 0.5) : 1),
  );
  const contentSkew = useTransform(skewX, (v) => -v * 0.55);

  // Unfold on mount. The page is laid *exactly* over the card box first (before
  // the first paint, so nothing flashes), then released to its resting size.
  // The card itself is suppressed for the editor's whole life, so this is a
  // continuation of the same sheet rather than a second copy of it.
  useLayoutEffect(() => {
    if (reduce) {
      scrim.set(1);
      occupy(true);
      return;
    }
    const page = pageRef.current;
    // Measured once, ever — not on every effect run. StrictMode double-invokes
    // this layout effect in dev; the `.set()` calls below commit the initial
    // transform to the DOM synchronously, so a second `getBoundingClientRect()`
    // would read the *already-shrunk* box back as "rest", collapsing the pose
    // math toward identity on the second pass and stomping the real unfold.
    if (page && restRef.current === null) restRef.current = page.getBoundingClientRect();
    if (page && from.width > 0) {
      const s = cardPose(from);
      x.set(s.x);
      y.set(s.y);
      sx.set(s.sx);
      sy.set(s.sy);
    }
    const spring = {
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 0.9,
    } as const;
    animate(x, 0, spring);
    animate(y, 0, spring);
    animate(sx, 1, spring);
    animate(sy, 1, spring);
    animate(pageOpacity, 1, { duration: 0.16 });
    animate(scrim, 1, { duration: 0.22 });
    // The card is left in place until the page has grown past it — the page
    // starts *exactly* over the card and only ever gets bigger, so it is
    // covered the whole time; suppressing it early would just flash a gap.
    const grown = window.setTimeout(() => occupy(true), 220);
    return () => window.clearTimeout(grown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whatever happens, never leave the pile with a permanently missing card.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => occupy(false), []);

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
    // From here the page owns the card outright, however early the close came.
    occupy(true);
    // Reduced motion, or the test runner (no rAF budget for the fold) — hand
    // off immediately. The fold choreography is exercised in the browser.
    if (reduce || import.meta.env.MODE === "test") {
      then();
      return;
    }

    const el = noteEl(note._id);
    const H0 = restRef.current?.height || pageRef.current?.offsetHeight || 1;

    // The destination is the card's *settled* slot, read from layout — the pile
    // may still be gliding from an optimistic edit or a re-sort, and a live
    // bounding rect would hand us a pose that has moved on by the time we
    // arrive. Rotation is the card's resting tilt so the sheet lands as it.
    const slot = noteSlotPose(note._id);
    const base = cardPose(
      slot ? new DOMRect(slot.left, slot.top, slot.width, slot.height) : from,
    );
    const target = {
      ...base,
      // the origin sits at 34% vertically, so the scale contracts the sheet
      // toward its top edge; this term keeps the shrinking page on the card
      y: base.y + 0.16 * H0 * (1 - base.sy),
      rotate: slot?.rotate ?? 0,
    };

    const run = async () => {
      // Stage 1 — pick up (~130ms). A small lift and a slight physical tilt,
      // the shadow deepens. The sheet is one continuous surface throughout —
      // no fold plane, no crease.
      await Promise.all([
        animate(y, y.get() - 7, { duration: 0.13, ease: [0.3, 0, 0.3, 1] }),
        animate(sx, 1 - (1 - target.sx) * 0.07, {
          duration: 0.15,
          ease: "easeOut",
        }),
        animate(sy, 1 - (1 - target.sy) * 0.13, {
          duration: 0.15,
          ease: "easeOut",
        }),
        animate(skewX, -1, { duration: 0.15, ease: "easeOut" }),
        animate(rotateX, 5, { duration: 0.15, ease: "easeOut" }),
        animate(depth, 1, { duration: 0.13 }),
      ]);

      // Stage 2 — contract while travelling (~430ms). The tilt straightens out
      // (monotonically, never re-bending) as width, height, x, y and rotation
      // all resolve toward the card together on one shared ease.
      const D = 0.43;
      animate(rotateX, 0, { duration: D * 0.55, ease: "easeOut" });
      animate(depth, 0.12, { duration: D, ease: "easeOut" });
      animate(skewX, [-1, 0.3, 0], { duration: D, ease: "easeInOut" });
      // the writing lets go over the back half — by the time the sheet is
      // card-sized it is blank paper, ready for the card's ink to resolve in
      animate(ink, 0, {
        duration: D * 0.62,
        delay: D * 0.3,
        ease: [0.4, 0, 0.7, 1],
      });
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

      // Stage 3 — the hand-off (~180ms). The page is already at the card's
      // exact size, rotation and position, and blank. The card is revealed
      // underneath it in this frame and the page cross-fades away over it:
      // same paper, same rect, so all that is visible is the writing arriving.
      occupy(false);
      if (el) {
        el.setAttribute("data-received", "");
        window.setTimeout(() => el.removeAttribute("data-received"), 320);
      }
      await Promise.all([
        animate(skewX, 0, { duration: 0.14, ease: "easeOut" }),
        animate(depth, 0, { duration: 0.14 }),
        animate(y, target.y, { duration: 0.14, ease: "easeOut" }),
        animate(pageOpacity, 0, { duration: 0.18, ease: "easeInOut" }),
      ]);
      then();
    };
    void run();
  };

  useEffect(() => {
    const id = window.setTimeout(
      () => titleRef.current?.focus(),
      reduce ? 0 : 240,
    );
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
    onSave(
      note._id,
      form.title.trim(),
      form.description.trim(),
      form.tag.trim() || DEFAULT_TAG,
    );
    foldAway(onClose);
  };

  return (
    <DeskOverlay>
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
            ["--sx" as string]: sx,
            ["--sy" as string]: sy,
          }}
        >
          {/* The sheet's torn top edge. It is the same edge the card carries and
            it stays attached the whole way: counter-scaled on Y only (so its
            thickness holds at ~8px while the page's height collapses) with the
            scallop pitch divided by the page's X scale (so the notches stay
            12px on screen and match the card's exactly at the hand-off). */}
          <span className="note-card__tear" aria-hidden="true" />

          {/* Counter-scaled: title + body only. This is the part that needs
            to stay readable — never uniformly scaled — while the paper folds.
            The footer below is deliberately NOT part of this wrapper: it used
            to be a child here, and the same counter-scale that keeps text
            legible was blowing it up past the shrinking page's own edges —
            the "controls floating off the paper" bug. Un-scaled, the footer
            shrinks at exactly the paper's own rate and can never exceed it. */}
          <m.div
            className="note-editor__content"
            style={{
              scaleY: contentScaleY,
              skewX: contentSkew,
              opacity: ink,
              transformOrigin: "top center",
            }}
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
          </m.div>

          <m.div className="note-editor__foot" style={{ opacity: ink }}>
            <TagSelect
              id="editor-tag"
              label="Tag"
              value={form.tag}
              onChange={(tag) => setForm((f) => ({ ...f, tag }))}
            />

            <span className="note-editor__actions">
              <button
                type="button"
                className="note-editor__cancel"
                onClick={() => foldAway(onClose)}
              >
                {dirty ? "Discard" : "Close"}
              </button>
              <button
                type="button"
                className="note-editor__save"
                onClick={save}
                disabled={invalid || !dirty}
              >
                Save
              </button>
            </span>
          </m.div>
        </m.div>
      </m.div>
    </DeskOverlay>
  );
}
