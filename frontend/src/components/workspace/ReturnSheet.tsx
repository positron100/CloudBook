import { useEffect } from "react";
import { m, useMotionValue, useTransform, animate } from "framer-motion";
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
  "polygon(0% 3.4%, 13% 0.6%, 27% 4.6%, 41% 1.4%, 55% 3.8%, 69% 0.9%, 82% 4.9%, 100% 2%, 100% 100%, 0% 100%)";
const EDGE_FLAT =
  "polygon(0% 0.6%, 13% 0.2%, 27% 0.8%, 41% 0.1%, 55% 0.7%, 69% 0.2%, 82% 0.9%, 100% 0.4%, 100% 100%, 0% 100%)";

/**
 * The exact inverse of the tear, over ONE sheet: the note lifts off the pile
 * and straightens (a quick tween), then a spring carries it back toward the
 * diary — growing to page proportions, its torn edge healing to a straight
 * page edge, its writing retracting — and it merges away. The note is already
 * gone from the data (optimistic delete); this is the physical send-off.
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
  const clipPath = useMotionValue(EDGE_TORN);
  const sheetOpacity = useMotionValue(1);
  const writing = useMotionValue(1);
  const contentScaleY = useTransform(scaleY, (v) => (v > 0.001 ? 1 / v : 1));

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Pick up off the pile and straighten.
      await Promise.all([
        animate(y, -14, { duration: 0.18, ease: [0.34, 0, 0.16, 1] }),
        animate(rotate, 0, { duration: 0.18, ease: "easeOut" }),
        animate(scaleX, 1.02, { duration: 0.18, ease: "easeOut" }),
      ]);
      if (cancelled) return;
      // Carry back — unfolding to page size, edge healing, writing retracting.
      const base = { type: "spring", mass: 1.05 } as const;
      animate(writing, 0, { duration: 0.34, ease: [0.4, 0, 1, 1] });
      animate(clipPath, EDGE_FLAT, { duration: 0.4, ease: [0.3, 0, 0.2, 1] });
      animate(sheetOpacity, 0, { duration: 0.36, delay: 0.34, ease: "easeIn" });
      await Promise.all([
        animate(x, dx, { ...base, stiffness: 84, damping: 18 }),
        animate(y, dy, { ...base, stiffness: 50, damping: 16 }),
        animate(rotate, [-0.5, -3, 0], { duration: 0.6, ease: "easeInOut" }),
        animate(scaleX, sx, { ...base, stiffness: 74, damping: 19 }),
        animate(scaleY, sy, { ...base, stiffness: 74, damping: 19 }),
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
        clipPath,
        opacity: sheetOpacity,
      }}
    >
      <m.div
        className="tear-sheet__page"
        style={{ transformOrigin: "top", scaleY: contentScaleY }}
      >
        <m.div style={{ opacity: writing }}>
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
    </m.div>
  );
}
