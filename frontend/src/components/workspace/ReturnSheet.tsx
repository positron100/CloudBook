import { useEffect } from "react";
import { m, useMotionValue, useTransform, animate } from "framer-motion";
import type { Note } from "@shared/types";
import { DeskOverlay } from "./DeskOverlay";
import { NoteFace } from "./NoteFace";
import "./TearSheet.css";

interface ReturnSheetProps {
  /** The card's slot rect. */
  from: DOMRect;
  /** The diary's written-area rect. */
  to: DOMRect;
  note: Note;
  onDone: () => void;
}

/**
 * The inverse of the tear: the sheet is taken off the pile and put back into
 * the notebook it came from.
 *
 *   1. pick up (~170ms) — it rises off the pile, straightens, the shadow deepens.
 *   2. carry (~620ms)   — one continuous move back to the diary's writing area,
 *      unfolding toward page proportions. The writing erases bottom-up (the
 *      reverse of how it was written) across the *back* of this stage, so it
 *      is gone exactly as the paper arrives rather than half a second earlier
 *      in mid-air. Ruled lines fade in as it goes, so the sheet always reads
 *      as paper, never a blank card.
 *   3. absorb (~220ms)  — only now, with the sheet lying flush on the page and
 *      its lift shadow at zero, is it taken in: it settles the last couple of
 *      pixels and fades into the paper it is now coincident with. The notebook
 *      gives a small "took it back" nudge in the same frame.
 *
 * The row is still in the store for all of this; the workspace removes it when
 * `onDone` fires, so the rest of the pile holds still while the sheet travels.
 */
export function ReturnSheet({ from, to, note, onDone }: ReturnSheetProps) {
  const dx = to.left - from.left;
  const dy = to.top - from.top;
  const sx = to.width / from.width;
  const sy = to.height / from.height;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);
  const scaleX = useMotionValue(1);
  const scaleY = useMotionValue(1);
  const skewX = useMotionValue(0);
  const lift = useMotionValue(0);
  // 0 = fully written, 1 = fully erased. Drives a bottom-up clip on the
  // content — reads as the writing being undone, not a fade.
  const erase = useMotionValue(0);
  const merge = useMotionValue(1);
  // Fades in as the text erases, so the sheet reads as paper — not a blank
  // card — for the rest of the trip back into the notebook.
  const ruled = useTransform(erase, [0, 1], [0, 1]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Pick up: rise off the pile, straighten, deepen the shadow.
      await Promise.all([
        animate(y, -13, { duration: 0.17, ease: [0.34, 0, 0.16, 1] }),
        animate(rotate, 0, { duration: 0.17, ease: "easeOut" }),
        animate(skewX, [0, 1.4], { duration: 0.18, ease: "easeOut" }),
        animate(lift, 1, { duration: 0.17, ease: "easeOut" }),
      ]);
      if (cancelled) return;
      // Carry back: one move to the page, unfolding toward its proportions.
      // The writing erases bottom-up over the back half — it runs out exactly
      // as the sheet arrives, not in mid-air — and the lift shadow is gone by
      // the time it touches.
      const D = 0.62;
      const base = { type: "spring", mass: 1 } as const;
      animate(erase, 1, {
        duration: D * 0.58,
        delay: D * 0.34,
        ease: [0.4, 0, 0.8, 1],
      });
      animate(skewX, 0, { duration: 0.4, ease: "easeOut" });
      animate(lift, 0, { duration: D * 0.9, ease: "easeInOut" });
      await Promise.all([
        animate(x, dx, { ...base, stiffness: 118, damping: 22 }),
        animate(y, dy, { ...base, stiffness: 104, damping: 21 }),
        animate(rotate, [-0.5, -2.4, 0], { duration: D, ease: "easeInOut" }),
        animate(scaleX, sx, { ...base, stiffness: 112, damping: 22 }),
        animate(scaleY, sy, { ...base, stiffness: 108, damping: 22 }),
      ]);
      if (cancelled) return;

      // Absorbed: the sheet is lying exactly on the writing area now, blank and
      // shadowless — the same paper as the page under it. It sinks the last
      // couple of pixels and is taken in. The notebook acknowledges the weight.
      const page = document.querySelector(".diary__page");
      page?.setAttribute("data-receiving", "");
      window.setTimeout(() => page?.removeAttribute("data-receiving"), 420);
      await Promise.all([
        animate(merge, 0, { duration: 0.22, ease: [0.4, 0, 0.9, 1] }),
        animate(y, dy + 3, { duration: 0.22, ease: "easeIn" }),
        animate(scaleY, sy * 0.985, { duration: 0.22, ease: "easeIn" }),
      ]);
      if (!cancelled) onDone();
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DeskOverlay>
      <m.div
        className="tear-sheet"
        aria-hidden="true"
        style={{
          position: "fixed",
          left: from.left,
          top: from.top,
          width: from.width,
          height: from.height,
          transformOrigin: "top left",
          zIndex: 850,
          x,
          y,
          rotate,
          scaleX,
          scaleY,
          skewX,
          opacity: merge,
          ["--lift" as string]: lift,
        }}
      >
        <NoteFace note={note} eraseProgress={erase} ruledOpacity={ruled} />
      </m.div>
    </DeskOverlay>
  );
}
