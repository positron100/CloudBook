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

// The torn top edge, drawn as a clip polygon (8 points across the top, 2 at the
// bottom). The tear runs left→right: the spine bites first (NICK), the rip
// crosses the middle (HALF), then the sheet is free (TORN).
const EDGE_FLAT =
  "polygon(0% 0.5%, 13% 0.2%, 27% 0.6%, 41% 0.1%, 55% 0.5%, 69% 0.2%, 82% 0.7%, 100% 0.3%, 100% 100%, 0% 100%)";
const EDGE_NICK =
  "polygon(0% 2.6%, 13% 0.6%, 27% 2.9%, 41% 0.4%, 55% 0.5%, 69% 0.2%, 82% 0.7%, 100% 0.3%, 100% 100%, 0% 100%)";
const EDGE_HALF =
  "polygon(0% 2.6%, 13% 0.5%, 27% 3.3%, 41% 1.0%, 55% 2.8%, 69% 0.7%, 82% 1.2%, 100% 0.4%, 100% 100%, 0% 100%)";
const EDGE_TORN =
  "polygon(0% 2.6%, 13% 0.5%, 27% 3.4%, 41% 1.1%, 55% 2.8%, 69% 0.7%, 82% 3.6%, 100% 1.5%, 100% 100%, 0% 100%)";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The create interaction — a sheet torn from the bound diary and hand-carried
 * to its slot. The flying object is a NoteFace (pixel-identical to the real
 * card), rendered at the card's final size and scaled *up* to page size so it
 * reads as a page for most of the trip.
 *
 *   1. tension (~90ms)  — pulled against the perforation: a small downward
 *      give, a hair of stretch, the first bite of the tear at the spine.
 *   2. rip + lift (~160ms) — the tear runs across the edge left→right while the
 *      sheet already begins to lift and twist. Flight starts before it is fully
 *      detached, so the whole thing reads as one move.
 *   3. hand-carry (~450ms) — a soft arc to the slot with a touch of rotational
 *      inertia; width, height, x, y and rotation all land on the card's exact
 *      pose in the same frame. The real card is revealed in that frame.
 */
export function TearSheet({ from, to, note, onDone }: TearSheetProps) {
  const startLeft = from.left;
  const startTop = from.top;
  const dx = to.left - startLeft;
  const dy = to.top - startTop;
  // Start page-sized (bounded), converge to the card. transform-origin is the
  // top-left — the bound corner — so the far corner leads on release.
  const upX = Math.min(2.4, Math.max(1, from.width / to.width));
  const upY = Math.min(2.6, Math.max(1, from.height / to.height));

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);
  const skewX = useMotionValue(0);
  const scaleX = useMotionValue(upX);
  const scaleY = useMotionValue(upY);
  const clipPath = useMotionValue(EDGE_FLAT);
  const lift = useMotionValue(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // 1 — tension against the perforation.
      await Promise.all([
        animate(y, 3, { duration: 0.09, ease: "easeOut" }),
        animate(scaleY, upY * 1.015, { duration: 0.09, ease: "easeOut" }),
        animate(skewX, -1.1, { duration: 0.09, ease: "easeOut" }),
        animate(clipPath, EDGE_NICK, { duration: 0.09, ease: "easeOut" }),
      ]);
      if (cancelled) return;

      // 2 — the rip runs across the edge; the sheet starts to lift and twist.
      animate(clipPath, [EDGE_NICK, EDGE_HALF, EDGE_TORN], {
        duration: 0.28,
        times: [0, 0.5, 1],
        ease: [0.3, 0, 0.3, 1],
      });
      animate(y, -11, { duration: 0.16, ease: "easeOut" });
      animate(rotate, -2.2, { duration: 0.16, ease: "easeOut" });
      animate(scaleY, upY, { duration: 0.14, ease: "easeOut" });
      animate(lift, 1, { duration: 0.16, ease: "easeOut" });
      // flight begins before the tear finishes
      await sleep(105);
      if (cancelled) return;

      // 3 — hand-carry. One duration for every channel → they land together.
      const D = 0.45;
      const yFrom = y.get();
      animate(skewX, [skewX.get(), 0.7, 0], { duration: D, ease: "easeInOut" });
      animate(lift, [1, 0.6, 0], { duration: D, ease: "easeInOut" });
      await Promise.all([
        animate(x, dx, { duration: D, ease: [0.25, 0.5, 0.3, 1] }),
        // arc — rise past the line, then ease down onto the pile
        animate(y, [yFrom, dy - 24, dy + 3, dy], {
          duration: D,
          times: [0, 0.5, 0.86, 1],
          ease: "easeInOut",
        }),
        // rotational inertia — swings back through the arc, settles flat
        animate(rotate, [-2.2, 1.3, 0.3, 0], {
          duration: D,
          times: [0, 0.45, 0.8, 1],
          ease: "easeInOut",
        }),
        // stays page-sized through most of the trip, converges near the end
        animate(scaleX, [upX, upX * 0.99, lerp(upX, 1, 0.6), 1], {
          duration: D,
          times: [0, 0.28, 0.62, 1],
          ease: [0.3, 0, 0.3, 1],
        }),
        animate(scaleY, [upY, upY * 0.99, lerp(upY, 1, 0.6), 1], {
          duration: D,
          times: [0, 0.28, 0.62, 1],
          ease: [0.3, 0, 0.3, 1],
        }),
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
        scaleX,
        scaleY,
        clipPath,
        ["--lift" as string]: lift,
      }}
    >
      <NoteFace note={note} />
    </m.div>
  );
}
