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
// crosses the middle (HALF), then the sheet is free (TORN), and it relaxes back
// toward flat in flight (SETTLE → FLAT). Exported so the opening intro's page
// tears with the exact same edge language.
export const EDGE_FLAT =
  "polygon(0% 0.5%, 13% 0.2%, 27% 0.6%, 41% 0.1%, 55% 0.5%, 69% 0.2%, 82% 0.7%, 100% 0.3%, 100% 100%, 0% 100%)";
export const EDGE_NICK =
  "polygon(0% 2.6%, 13% 0.6%, 27% 2.9%, 41% 0.4%, 55% 0.5%, 69% 0.2%, 82% 0.7%, 100% 0.3%, 100% 100%, 0% 100%)";
export const EDGE_HALF =
  "polygon(0% 2.6%, 13% 0.5%, 27% 3.3%, 41% 1.0%, 55% 2.8%, 69% 0.7%, 82% 1.2%, 100% 0.4%, 100% 100%, 0% 100%)";
export const EDGE_TORN =
  "polygon(0% 2.6%, 13% 0.5%, 27% 3.4%, 41% 1.1%, 55% 2.8%, 69% 0.7%, 82% 3.6%, 100% 1.5%, 100% 100%, 0% 100%)";
export const EDGE_SETTLE =
  "polygon(0% 1.3%, 13% 0.4%, 27% 1.7%, 41% 0.5%, 55% 1.4%, 69% 0.4%, 82% 1.8%, 100% 0.7%, 100% 100%, 0% 100%)";

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
  // Stretches / dims the punched binding holes as the page pulls off the rings,
  // then relaxes to the resting note's look as it flies free.
  const bindTension = useMotionValue(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // 1 — resistance (~85ms). The page pulls against the binding: it dips,
      // the sheet bows, the holes stretch, the shadow lifts a little, and only
      // the spine end of the perforation has opened. Nothing has left yet.
      await Promise.all([
        animate(y, 4, { duration: 0.085, ease: "easeOut" }),
        animate(scaleY, upY * 1.02, { duration: 0.085, ease: "easeOut" }),
        animate(skewX, -1.4, { duration: 0.085, ease: "easeOut" }),
        animate(clipPath, EDGE_NICK, { duration: 0.085, ease: "easeOut" }),
        animate(bindTension, 1, { duration: 0.09, ease: "easeOut" }),
        animate(lift, 0.3, { duration: 0.085, ease: "easeOut" }),
      ]);
      if (cancelled) return;

      // 2 — release (~80ms). The rip runs across the rest of the edge and, a
      // beat in, the sheet lifts — accelerating, so the carry inherits its
      // speed rather than starting from rest.
      animate(clipPath, [EDGE_NICK, EDGE_HALF, EDGE_TORN], {
        duration: 0.1,
        times: [0, 0.55, 1],
        ease: [0.3, 0, 0.4, 1],
      });
      animate(scaleY, upY, { duration: 0.12, ease: "easeOut" });
      animate(y, -13, { duration: 0.14, ease: [0.4, 0, 0.65, 1] });
      animate(rotate, -2.4, { duration: 0.14, ease: [0.4, 0, 0.65, 1] });
      animate(lift, 1, { duration: 0.14, ease: "easeOut" });
      await sleep(80);
      if (cancelled) return;

      // 3 — uninterrupted flight (~460ms). Carries from the release velocity;
      // the ragged edge relaxes as the sheet flies free; every channel lands
      // on the card's exact pose in the same frame. The pile takes the page
      // with a 1px dip just before the handoff.
      const D = 0.46;
      const yFrom = y.get();
      animate(skewX, [skewX.get(), 0.6, 0], { duration: D, ease: "easeInOut" });
      animate(lift, [1, 0.55, 0], { duration: D, ease: "easeInOut" });
      animate(bindTension, 0, { duration: D * 0.6, ease: "easeOut" });
      animate(clipPath, [EDGE_TORN, EDGE_SETTLE, EDGE_FLAT], {
        duration: D * 0.72,
        times: [0, 0.45, 1],
        ease: "easeOut",
      });
      window.setTimeout(() => {
        if (cancelled) return;
        const esc = window.CSS?.escape ?? String;
        const card = document.querySelector(`[data-note-id="${esc(note._id)}"]`);
        if (card) {
          card.setAttribute("data-received", "");
          window.setTimeout(() => card.removeAttribute("data-received"), 320);
        }
      }, D * 1000 - 70);
      await Promise.all([
        animate(x, dx, { duration: D, ease: [0.22, 0.55, 0.3, 1] }),
        // rise toward the line, then settle straight onto the pile — no overshoot
        animate(y, [yFrom, dy - 22, dy], {
          duration: D,
          times: [0, 0.52, 1],
          ease: ["easeOut", "easeInOut"],
        }),
        // rotational inertia — swings the other way, settles flat
        animate(rotate, [rotate.get(), 1.1, 0.2, 0], {
          duration: D,
          times: [0, 0.42, 0.78, 1],
          ease: "easeInOut",
        }),
        // page-sized for most of the trip, converges late and gently
        animate(scaleX, [upX, upX * 0.985, lerp(upX, 1, 0.72), 1], {
          duration: D,
          times: [0, 0.3, 0.72, 1],
          ease: [0.3, 0, 0.3, 1],
        }),
        animate(scaleY, [upY, upY * 0.985, lerp(upY, 1, 0.72), 1], {
          duration: D,
          times: [0, 0.3, 0.72, 1],
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
        ["--bind-tension" as string]: bindTension,
      }}
    >
      <NoteFace note={note} />
    </m.div>
  );
}
