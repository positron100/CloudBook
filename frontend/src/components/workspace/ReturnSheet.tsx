import { useState } from "react";
import { m } from "framer-motion";
import type { Note } from "@shared/types";
import { Chip } from "@/components/ui";
import { formatRelativeDate } from "@/utils/date";
import "./TearSheet.css";

interface ReturnSheetProps {
  from: DOMRect;
  to: DOMRect;
  note: Note;
  onDone: () => void;
}

const EDGE_TORN =
  "polygon(0% 5%, 12% 1.5%, 24% 5.5%, 37% 2%, 50% 5%, 63% 1.5%, 76% 5.5%, 88% 2%, 100% 4.5%, 100% 100%, 0% 100%)";
const EDGE_FLAT =
  "polygon(0% 1.5%, 12% 1%, 24% 1.5%, 37% 1%, 50% 1.5%, 63% 1%, 76% 1.5%, 88% 1%, 100% 1.5%, 100% 100%, 0% 100%)";

/**
 * The inverse of the tear: the note is picked up off the pile, unfolds toward
 * notebook-page proportions, its writing fades, then it arcs back and settles
 * into the diary. The persistent note is already gone from the data (optimistic
 * delete) — this is the physical send-off.
 *
 *   lift    the sheet rises off the pile and straightens
 *   carry   it arcs toward the diary, growing to page size, writing fading
 *   attach  the torn edge heals to a straight page edge; it merges away
 */
export function ReturnSheet({ from, to, note, onDone }: ReturnSheetProps) {
  const [phase, setPhase] = useState<"lift" | "carry">("lift");

  const dx = to.left - from.left;
  const dy = to.top - from.top;
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  const arcY = Math.min(0, dy) - Math.max(36, Math.abs(dx) * 0.12);

  const outer =
    phase === "lift"
      ? { y: -12, rotate: 0, scale: 1.02, clipPath: EDGE_TORN }
      : {
          x: [0, dx * 0.5, dx],
          y: [-12, arcY, dy],
          rotate: [0, -3, 0],
          scaleX: [1, (1 + sx) / 2, sx],
          scaleY: [1, (1 + sy) / 2, sy],
          clipPath: [EDGE_TORN, EDGE_TORN, EDGE_FLAT],
          opacity: [1, 1, 0],
        };

  const outerTransition =
    phase === "lift"
      ? { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const }
      : {
          duration: 0.6,
          ease: [0.3, 0.86, 0.36, 1] as const,
          times: [0, 0.5, 1],
          opacity: { duration: 0.6, times: [0, 0.7, 1] },
        };

  const inner =
    phase === "carry"
      ? { scaleY: [1, 2 / (1 + sy), 1 / sy], opacity: [1, 0.15, 0] }
      : { scaleY: 1, opacity: 1 };
  const innerTransition =
    phase === "carry"
      ? { duration: 0.6, ease: [0.3, 0.86, 0.36, 1] as const, times: [0, 0.5, 1], opacity: { duration: 0.42 } }
      : { duration: 0.16 };

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
      initial={{ clipPath: EDGE_TORN, y: 0, rotate: 0, x: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
      animate={outer}
      transition={outerTransition}
      onAnimationComplete={() => {
        if (phase === "lift") setPhase("carry");
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
