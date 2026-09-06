import { useState } from "react";
import { m } from "framer-motion";
import type { Note } from "@shared/types";
import { Chip } from "@/components/ui";
import { formatRelativeDate } from "@/utils/date";
import "./TearSheet.css";

interface TearSheetProps {
  from: DOMRect;
  to: DOMRect;
  note: Note;
  onDone: () => void;
}

// Same vertex count both sides so Framer interpolates the top edge from a
// straight cut to a fine ragged tear (a few px of texture, not SVG teeth).
const EDGE_FLAT =
  "polygon(0% 1.5%, 12% 1%, 24% 1.5%, 37% 1%, 50% 1.5%, 63% 1%, 76% 1.5%, 88% 1%, 100% 1.5%, 100% 100%, 0% 100%)";
const EDGE_TORN =
  "polygon(0% 5%, 12% 1.5%, 24% 5.5%, 37% 2%, 50% 5%, 63% 1.5%, 76% 5.5%, 88% 2%, 100% 4.5%, 100% 100%, 0% 100%)";

/**
 * The signature create interaction — the same written page, torn from the
 * notebook and carried to the pile, over ONE element:
 *
 *   prep    the sheet lifts a hair off the pad
 *   tear    its top edge unzips into a ragged tear, the sheet bends
 *   flight  it arcs from the notebook toward its slot, rotating and shrinking
 *   land    it settles; the (already-present) real card takes over
 *
 * Content is counter-scaled so the words stay crisp and simply clip as the
 * sheet shrinks to card size — the page is placed, not squashed. Runs off an
 * optimistic note, so it never waits on the network.
 */
export function TearSheet({ from, to, note, onDone }: TearSheetProps) {
  const [phase, setPhase] = useState<"prep" | "tear" | "flight">("prep");

  const dx = to.left - from.left;
  const dy = to.top - from.top;
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  const arcY = Math.min(0, dy) - Math.max(40, Math.abs(dx) * 0.14);

  const outer =
    phase === "prep"
      ? { y: -6, rotate: -1, clipPath: EDGE_FLAT }
      : phase === "tear"
        ? { y: -12, rotate: -3.2, skewX: -1.6, clipPath: EDGE_TORN }
        : {
            x: [0, dx * 0.5, dx],
            y: [-12, arcY, dy],
            rotate: [-3.2, 5, 1.5],
            skewX: [-1.6, -0.6, 0],
            scaleX: [1, (1 + sx) / 2, sx],
            scaleY: [1, (1 + sy) / 2, sy],
            clipPath: EDGE_TORN,
          };

  const outerTransition =
    phase === "prep"
      ? { duration: 0.12, ease: [0.16, 1, 0.3, 1] as const }
      : phase === "tear"
        ? { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }
        : { duration: 0.62, ease: [0.3, 0.86, 0.36, 1] as const, times: [0, 0.5, 1] };

  // Keep the content upright: inverse of the outer's vertical scale.
  const inner =
    phase === "flight"
      ? { scaleY: [1, 2 / (1 + sy), 1 / sy], opacity: [1, 1, 0] }
      : { scaleY: 1, opacity: 1 };
  const innerTransition =
    phase === "flight"
      ? { duration: 0.62, ease: [0.3, 0.86, 0.36, 1] as const, times: [0, 0.5, 1], opacity: { duration: 0.62, times: [0, 0.9, 1] } }
      : { duration: 0.2 };

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
      }}
      initial={{ clipPath: EDGE_FLAT, y: 0, rotate: 0, x: 0, scaleX: 1, scaleY: 1 }}
      animate={outer}
      transition={outerTransition}
      onAnimationComplete={() => {
        if (phase === "prep") setPhase("tear");
        else if (phase === "tear") setPhase("flight");
        else onDone();
      }}
    >
      <m.div className="tear-sheet__page" style={{ transformOrigin: "top" }} animate={inner} transition={innerTransition}>
        <h3 className="tear-sheet__title">{note.title}</h3>
        <p className="tear-sheet__body">{note.description}</p>
        <div className="tear-sheet__foot">
          {note.tag && <Chip tone="accent">{note.tag}</Chip>}
          {note.date && (
            <time className="tear-sheet__date" dateTime={note.date}>
              {formatRelativeDate(note.date)}
            </time>
          )}
        </div>
      </m.div>
    </m.div>
  );
}
