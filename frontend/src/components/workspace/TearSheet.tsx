import { useEffect } from "react";
import { m, useMotionValue, animate } from "framer-motion";
import type { Note } from "@shared/types";
import { NoteFace } from "./NoteFace";
import "./TearSheet.css";

interface TearSheetProps {
  /** The diary's written-area rect. */
  from: DOMRect;
  /** The exact slot the new card occupies in the pile. */
  to: DOMRect;
  note: Note;
  onDone: () => void;
}

const EDGE_FLAT =
  "polygon(0% 0.5%, 13% 0.2%, 27% 0.6%, 41% 0.1%, 55% 0.5%, 69% 0.2%, 82% 0.7%, 100% 0.3%, 100% 100%, 0% 100%)";
const EDGE_TORN =
  "polygon(0% 2.6%, 13% 0.5%, 27% 3.4%, 41% 1.1%, 55% 2.8%, 69% 0.7%, 82% 3.6%, 100% 1.5%, 100% 100%, 0% 100%)";

/**
 * The create interaction. The flying object is a NoteFace — pixel-identical to
 * the real card — at the card's final size from the first frame. It lifts off
 * the top of the written area (a quick tension-and-release), then one spring
 * carries it to the exact slot, arriving already in the card's pose. The real
 * card is revealed in the same commit the sheet unmounts, so there is nothing
 * to see swap.
 */
export function TearSheet({ from, to, note, onDone }: TearSheetProps) {
  // Card-shaped, anchored at the top-left of what was written.
  const startLeft = from.left;
  const startTop = from.top;
  const dx = to.left - startLeft;
  const dy = to.top - startTop;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);
  const skewX = useMotionValue(0);
  const scale = useMotionValue(1);
  const clipPath = useMotionValue(EDGE_FLAT);
  const lift = useMotionValue(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Tear — tension against the perforation, then release.
      await Promise.all([
        animate(y, -12, { duration: 0.22, ease: [0.34, 0, 0.1, 1] }),
        animate(rotate, -3, { duration: 0.22, ease: [0.34, 0, 0.1, 1] }),
        animate(skewX, [0, -2.4, -1.2], { duration: 0.24, ease: "easeOut" }),
        animate(scale, [1, 1.018, 1.006], { duration: 0.24, ease: "easeOut" }),
        animate(clipPath, EDGE_TORN, { duration: 0.2, ease: [0.3, 0, 0.2, 1] }),
        animate(lift, 1, { duration: 0.22, ease: "easeOut" }),
      ]);
      if (cancelled) return;
      // Carry — springs continue from the tear's velocity. x stiffer than y so
      // the path bows into an arc; every value lands on the card's exact pose.
      const base = { type: "spring", mass: 1 } as const;
      await Promise.all([
        animate(x, dx, { ...base, stiffness: 96, damping: 19 }),
        animate(y, dy, { ...base, stiffness: 58, damping: 17 }),
        animate(rotate, 0, { ...base, stiffness: 70, damping: 16 }),
        animate(skewX, 0, { ...base, stiffness: 140, damping: 22 }),
        animate(scale, 1, { ...base, stiffness: 90, damping: 20 }),
        animate(lift, 0, { ...base, stiffness: 60, damping: 20 }),
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
        left: startLeft,
        top: startTop,
        width: to.width,
        height: to.height,
        transformOrigin: "top left",
        zIndex: 850,
        x,
        y,
        rotate,
        skewX,
        scale,
        clipPath,
        ["--lift" as string]: lift,
      }}
    >
      <NoteFace note={note} />
    </m.div>
  );
}
