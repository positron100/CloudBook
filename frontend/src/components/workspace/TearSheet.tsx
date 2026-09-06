import { useEffect } from "react";
import { m, useMotionValue, useTransform, animate } from "framer-motion";
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

// Same vertex count both sides so the top edge interpolates from a clean cut
// to a fine irregular tear — a few px of asymmetric texture, no SVG teeth.
const EDGE_FLAT =
  "polygon(0% 0.6%, 13% 0.2%, 27% 0.8%, 41% 0.1%, 55% 0.7%, 69% 0.2%, 82% 0.9%, 100% 0.4%, 100% 100%, 0% 100%)";
const EDGE_TORN =
  "polygon(0% 3.4%, 13% 0.6%, 27% 4.6%, 41% 1.4%, 55% 3.8%, 69% 0.9%, 82% 4.9%, 100% 2%, 100% 100%, 0% 100%)";

/**
 * The signature create interaction. ONE sheet, one continuous move: it tears
 * from the notebook (a quick tension-and-release tween) and the carry is a
 * spring that *inherits that velocity* — Framer retargets from the current
 * value + speed, so there is no phase boundary to see. The written content is
 * counter-scaled off the same motion value, so the words stay crisp and just
 * clip as the sheet settles to card size. Runs off the optimistic note.
 */
export function TearSheet({ from, to, note, onDone }: TearSheetProps) {
  const dx = to.left - from.left;
  const dy = to.top - from.top;
  const sx = to.width / from.width;
  const sy = to.height / from.height;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);
  const skewX = useMotionValue(0);
  const scaleX = useMotionValue(1);
  const scaleY = useMotionValue(1);
  const clipPath = useMotionValue(EDGE_FLAT);
  const contentScaleY = useTransform(scaleY, (v) => (v > 0.001 ? 1 / v : 1));

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Tear — the sheet takes tension against the perforation, then releases.
      await Promise.all([
        animate(y, -13, { duration: 0.24, ease: [0.34, 0, 0.12, 1] }),
        animate(rotate, -3.4, { duration: 0.24, ease: [0.34, 0, 0.12, 1] }),
        animate(skewX, [0, -2.6, -1.4], { duration: 0.26, ease: "easeOut" }),
        animate(scaleX, [1, 0.985, 1], { duration: 0.26, ease: "easeOut" }),
        animate(clipPath, EDGE_TORN, { duration: 0.22, ease: [0.3, 0, 0.2, 1] }),
      ]);
      if (cancelled) return;
      // Carry — one spring, continuing from the tear's velocity. x is stiffer
      // than y so the path bows: it moves out, then drops in — a natural arc,
      // no keyframe seam.
      const base = { type: "spring", mass: 1.05 } as const;
      await Promise.all([
        animate(x, dx, { ...base, stiffness: 90, damping: 18 }),
        animate(y, dy, { ...base, stiffness: 52, damping: 16 }),
        animate(rotate, 1.5, { ...base, stiffness: 66, damping: 15 }),
        animate(skewX, 0, { ...base, stiffness: 120, damping: 20 }),
        animate(scaleX, sx, { ...base, stiffness: 80, damping: 18 }),
        animate(scaleY, sy, { ...base, stiffness: 80, damping: 18 }),
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
        skewX,
        scaleX,
        scaleY,
        clipPath,
      }}
    >
      <m.div className="tear-sheet__page" style={{ transformOrigin: "top", scaleY: contentScaleY }}>
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
