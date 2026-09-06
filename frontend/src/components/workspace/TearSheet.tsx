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

// Same vertex count both sides so Framer can interpolate the bottom edge from
// near-straight to a fine ragged tear (a few px of texture, not SVG teeth).
const EDGE_FLAT =
  "polygon(0% 0%, 0% 98.5%, 12% 99%, 24% 98.5%, 37% 99%, 50% 98.5%, 63% 99%, 76% 98.5%, 88% 99%, 100% 98.5%, 100% 0%)";
const EDGE_TORN =
  "polygon(0% 0%, 0% 95%, 12% 98.5%, 24% 94.5%, 37% 98%, 50% 95%, 63% 98.5%, 76% 94.5%, 88% 98%, 100% 95.5%, 100% 0%)";

/**
 * The signature create interaction — four continuous phases over ONE element:
 *
 *   prep    the written page lifts a hair, the bottom edge starts to give
 *   tear    the edge unzips into a ragged tear, the page bends off the pad
 *   flight  it arcs from the notebook toward the pile, rotating and shrinking
 *   land    it overshoots its slot and settles; the real card takes over
 *
 * Mounted only after the API confirms the note; never rendered on failure.
 */
export function TearSheet({ from, to, title, body, onDone }: TearSheetProps) {
  const [phase, setPhase] = useState<"prep" | "tear" | "flight">("prep");

  const dx = to.left - from.left;
  const dy = to.top - from.top;
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  const arcY = Math.min(0, dy) - 64;

  const target =
    phase === "prep"
      ? { y: -6, rotate: -1, clipPath: EDGE_FLAT }
      : phase === "tear"
        ? { y: -12, rotate: -3.5, skewX: -2, clipPath: EDGE_TORN }
        : {
            x: [0, dx * 0.55, dx],
            y: [-12, arcY, dy],
            rotate: [-3.5, 6, 1.5],
            skewX: [-2, -1, 0],
            scaleX: [1, (1 + sx) / 2, sx],
            scaleY: [1, (1 + sy) / 2, sy],
            clipPath: EDGE_TORN,
            opacity: [1, 1, 0],
          };

  const transition =
    phase === "prep"
      ? { duration: 0.13, ease: [0.16, 1, 0.3, 1] as const }
      : phase === "tear"
        ? { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }
        : {
            duration: 0.58,
            ease: [0.32, 0.9, 0.35, 1] as const,
            times: [0, 0.52, 1],
            opacity: { duration: 0.58, times: [0, 0.86, 1] },
          };

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
      initial={{ clipPath: EDGE_FLAT, y: 0, rotate: 0, x: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
      animate={target}
      transition={transition}
      onAnimationComplete={() => {
        if (phase === "prep") setPhase("tear");
        else if (phase === "tear") setPhase("flight");
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
