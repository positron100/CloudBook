import { useCallback, useEffect, useRef, useState } from "react";
import { m, useMotionValue, useTransform, animate, type MotionValue } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import "./OpeningScene.css";

interface OpeningSceneProps {
  onDone: () => void;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* --- book geometry (SVG viewBox 0 0 100 80) ---------------------------------
   Measured from the reference clip (Downloads/Book.mp4, 2731×1440) by
   thresholding its final frame: a flat monoline "open book" icon, #e8e8e8
   strokes on black, that a pen draws on stroke by stroke. Coordinates are the
   clip's pixel positions scaled so the book spans 90 units wide, centred;
   stroke width is the clip's 68 px at the same scale (4.8). Symmetric about
   x = 50. No gradients, shadows or 3-D transform (the bookmark is the one
   solid fill) — the only depth is the splayed parallelogram geometry itself.

   Every path is drawn by animating `pathLength` 0 → 1 (Framer sets the
   stroke-dash under the hood). Each path's point order is the pen's actual
   direction in the clip, so the ink appears where the reference's does. */

// pages — one closed stroke each, starting at the spine base: along the bottom
// edge outward, up the outer edge, along the top edge back to the spine, then
// down the spine edge (Z). The two spine edges sit 9 apart (a deliberate,
// symmetric centre gap the user asked for — the clip's touch at 5).
//
// Each page is a true PARALLELOGRAM: the outer and spine edges are both
// vertical and the same length (47), so the top edge vector exactly equals the
// bottom edge vector ((33, 12.6)). Top and bottom therefore stay exactly
// parallel — no taper, no divergence — in every draw state.
const PAGE_L = "M45.5,66.3 L12.5,53.7 L12.5,6.7 L45.5,19.3 Z";
const PAGE_R = "M54.5,66.3 L87.5,53.7 L87.5,6.7 L54.5,19.3 Z";
// cover boards — an open bracket outside each page: starts at the bottom apex
// under the spine, out along the bottom, then up the (vertical) outer edge to
// just below the page's top corner. The bottom segment uses the SAME vector as
// the page's bottom edge (slope 12.6/33), so the cover's lower line runs
// exactly parallel to the page's lower line instead of angling away.
const COVER_L = "M42.1,75.7 L4.4,61.31 L4.4,9";
const COVER_R = "M57.9,75.7 L95.6,61.31 L95.6,9";
// bookmark — a notched ribbon on the left page: a closed shape, 6 wide, ~11.5
// long. Both long sides are vertical (x 27 / 33) to match the book's squarish
// language; the top edge sits exactly on the left page's top edge (slope
// 12.6/33, from PAGE_L) so it reads as part of the page, and the bottom is a
// centred V-notch. Point order = the pen's path: top edge → down the right
// side → up to the notch apex → down to the left tail → close up the left side.
// Filled with the same ink as the lines; fill-opacity rides the draw progress.
const MARK = "M27,12.2 L33,14.5 L33,26 L30,21.9 L27,23.7 Z";

/** One pen stroke. Hidden until its own draw begins — at `pathLength` 0 a
 *  round-capped path still paints a dot at its start point, and the clip has
 *  no such dots waiting on the page. `filled` shapes fade their fill in on the
 *  draw progress so they never pop. */
function Stroke({ d, draw, filled }: { d: string; draw: MotionValue<number>; filled?: boolean }) {
  const opacity = useTransform(draw, [0, 0.001], [0, 1]);
  return (
    <m.path
      className={filled ? "opening__ink opening__ink--filled" : "opening__ink"}
      d={d}
      style={{ pathLength: draw, opacity, fillOpacity: filled ? draw : undefined }}
    />
  );
}

/**
 * The signature opening — a stroke-by-stroke recreation of Downloads/Book.mp4.
 *
 *   pen dot → draw left page → draw right page → (hold) → draw left cover →
 *   draw right cover → (hold) → draw bookmark → (hold) → circular reveal to
 *   the running app underneath.
 *
 * Self-contained: no context, no API, no dependency on navigation or on when
 * Home renders. All SVG + Framer, no per-frame React.
 */
export default function OpeningScene({ onDone }: OpeningSceneProps) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  // one pen stroke each — 0 → 1 draws it on
  const drawPageL = useMotionValue(0);
  const drawPageR = useMotionValue(0);
  const drawCoverL = useMotionValue(0);
  const drawCoverR = useMotionValue(0);
  const drawMark = useMotionValue(0);

  const sceneOpacity = useMotionValue(1); // reduced-motion exit only
  const [revealing, setRevealing] = useState(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    let cancelled = false;

    const TS = (() => {
      try {
        return new URLSearchParams(window.location.search).has("introslow") ? 6 : 1;
      } catch {
        return 1;
      }
    })();
    const D = (s: number) => s * TS;
    const nap = (s: number) => sleep(s * 1000 * TS);
    // per stroke the clip's pen ramps up briefly, runs, then decelerates over
    // a long tail (measured from lit-pixel growth per frame)
    const pen = { duration: 0, ease: [0.35, 0, 0.2, 1] as const };
    const stroke = (v: typeof drawPageL, s: number) =>
      animate(v, 1, { ...pen, duration: D(s) });

    // The book opens into the app: the clip loops with no transition out, so
    // the wipe is the app's own circular reveal, kept minimal — a soft-edged
    // mask hole grows from the centre out to the running UI underneath (which
    // has been mounted under this opaque layer since the first frame).
    // `setInterval`, not a Framer tween or `@property` keyframe — those do not
    // tick reliably this deep in the sequence under <LazyMotion> here.
    const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
    const revealOut = (fast = false) =>
      new Promise<void>((resolve) => {
        if (doneRef.current) return resolve();
        const durMs = D(fast ? 0.28 : 0.5) * 1000;
        const root = rootRef.current;
        setRevealing(true);
        const start = now();
        let timer = 0;
        const done = () => {
          window.clearInterval(timer);
          finish();
          resolve();
        };
        const tick = () => {
          const p = Math.min(1, (now() - start) / durMs);
          const hole = Math.pow(p, 2); // stays small around the book, then races out
          root?.style.setProperty("--reveal-r", (0.5 + hole * 160).toFixed(2));
          if (p >= 1 || doneRef.current) done();
        };
        timer = window.setInterval(tick, 1000 / 60);
        tick();
      });

    const skip = () => {
      if (doneRef.current || cancelled) return;
      cancelled = true;
      void revealOut(true);
    };

    const runStatic = async () => {
      // Reduced motion: the finished book, no drawing, then a short fade.
      drawPageL.set(1);
      drawPageR.set(1);
      drawCoverL.set(1);
      drawCoverR.set(1);
      drawMark.set(1);
      await nap(0.7);
      if (cancelled) return;
      await animate(sceneOpacity, 0, { duration: 0.3, ease: "easeInOut" });
      finish();
    };

    // Timings are the clip's, read off its lit-pixel timeline (stroke start →
    // end, in seconds): black 0–0.16 · L page 0.16–1.20 · R page 1.20–2.06 ·
    // hold · L cover 2.30–3.15 · R cover 3.30–4.28 · bookmark 4.40–5.15 ·
    // static hold to the 5.9 s loop point.
    const run = async () => {
      await nap(0.16); // black beat before the pen touches down
      if (cancelled) return;

      // 1 — PAGES. Left as one stroke, then right straight after.
      await stroke(drawPageL, 1.04);
      if (cancelled) return;
      await stroke(drawPageR, 0.86);
      if (cancelled) return;
      await nap(0.24);

      // 2 — COVER BOARDS. Left, a short pause, then right.
      await stroke(drawCoverL, 0.85);
      if (cancelled) return;
      await nap(0.15);
      await stroke(drawCoverR, 0.98);
      if (cancelled) return;
      await nap(0.12);

      // 3 — BOOKMARK. Drawn onto the left page.
      await stroke(drawMark, 0.75);
      if (cancelled) return;
      await nap(0.6); // the finished book holds

      // 4 — the book opens into the app (the clip loops here).
      await revealOut();
    };

    void (reduce ? runStatic() : run());

    const cap = window.setTimeout(finish, 9000 * Math.max(TS, 1));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    const el = rootRef.current;
    el?.addEventListener("pointerdown", skip);

    return () => {
      cancelled = true;
      window.clearTimeout(cap);
      window.removeEventListener("keydown", onKey);
      el?.removeEventListener("pointerdown", skip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <m.div
      ref={rootRef}
      className="opening"
      role="presentation"
      data-revealing={revealing || undefined}
      style={{ opacity: sceneOpacity }}
    >
      <span className="sr-only" role="status">
        Opening CloudBook
      </span>

      <div className="opening__stage" aria-hidden="true">
        <svg
          className="opening__svg"
          viewBox="0 0 100 80"
          preserveAspectRatio="xMidYMid meet"
          fill="none"
        >
          <Stroke d={PAGE_L} draw={drawPageL} />
          <Stroke d={PAGE_R} draw={drawPageR} />
          <Stroke d={COVER_L} draw={drawCoverL} />
          <Stroke d={COVER_R} draw={drawCoverR} />
          <Stroke d={MARK} draw={drawMark} filled />
        </svg>
      </div>
    </m.div>
  );
}
