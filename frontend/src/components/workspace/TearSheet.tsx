import { useState } from "react";
import { m } from "framer-motion";
import "./TearSheet.css";

interface TearSheetProps {
  from: DOMRect;
  to: DOMRect;
  title: string;
  body: string;
  onDone: () => void;
}

// Same vertex count both sides so Framer can interpolate the top edge from
// straight to torn.
const FLAT =
  "polygon(0% 0%, 12% 0%, 26% 0%, 41% 0%, 58% 0%, 73% 0%, 88% 0%, 100% 0%, 100% 100%, 0% 100%)";
const TORN =
  "polygon(0% 5%, 12% 0%, 26% 6%, 41% 1%, 58% 7%, 73% 2%, 88% 6%, 100% 1%, 100% 100%, 0% 100%)";

/**
 * The signature create interaction. A clone of the notebook page tears off at
 * the top, lifts, then flies and shrinks onto the new card's slot in the
 * stack. Mounted only after the API has confirmed the note; on failure it is
 * never rendered. One element, one continuous move.
 */
export function TearSheet({ from, to, title, body, onDone }: TearSheetProps) {
  const [phase, setPhase] = useState<"rip" | "fly">("rip");

  const dx = to.left - from.left;
  const dy = to.top - from.top;
  const sx = to.width / from.width;
  const sy = to.height / from.height;

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
        zIndex: 90,
      }}
      initial={{ clipPath: FLAT, y: 0, rotate: 0, x: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
      animate={
        phase === "rip"
          ? { clipPath: TORN, y: -12, rotate: -1.4 }
          : { clipPath: TORN, x: dx, y: dy, scaleX: sx, scaleY: sy, rotate: 0, opacity: [1, 1, 0] }
      }
      transition={
        phase === "rip"
          ? { duration: 0.19, ease: [0.16, 1, 0.3, 1] }
          : {
              default: { duration: 0.46, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.46, times: [0, 0.8, 1] },
            }
      }
      onAnimationComplete={() => {
        if (phase === "rip") setPhase("fly");
        else onDone();
      }}
    >
      <div className="tear-sheet__page">
        <h3 className="tear-sheet__title">{title}</h3>
        <p className="tear-sheet__body">{body}</p>
      </div>
    </m.div>
  );
}
