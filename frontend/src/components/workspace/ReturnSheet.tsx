import { useEffect } from "react";
import { m, useMotionValue, animate } from "framer-motion";
import type { Note } from "@shared/types";
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
 * The inverse of the tear. The same NoteFace lifts off the pile, and as one
 * spring carries it back to the diary it unfolds toward the writing page,
 * its ink retracting, until it aligns with the page and its lift shadow is
 * gone — then it merges away. The note is already deleted from the data.
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
  const ink = useMotionValue(1);
  const merge = useMotionValue(1);

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
      // Carry back: unfold toward page proportions, ink retracts, lift eases
      // out, then it merges once it is essentially on the page.
      const base = { type: "spring", mass: 1 } as const;
      animate(ink, 0, { duration: 0.32, ease: [0.4, 0, 1, 1] });
      animate(skewX, 0, { duration: 0.4, ease: "easeOut" });
      animate(lift, 0, { duration: 0.44, ease: "easeInOut" });
      animate(merge, 0, { duration: 0.22, delay: 0.42, ease: "easeIn" });
      await Promise.all([
        animate(x, dx, { ...base, stiffness: 88, damping: 19 }),
        animate(y, dy, { ...base, stiffness: 52, damping: 17 }),
        animate(rotate, [-0.5, -2.4, 0], { duration: 0.62, ease: "easeInOut" }),
        animate(scaleX, sx, { ...base, stiffness: 78, damping: 20 }),
        animate(scaleY, sy, { ...base, stiffness: 72, damping: 20 }),
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
      <NoteFace note={note} contentOpacity={ink} />
    </m.div>
  );
}
