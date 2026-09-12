import { m } from "framer-motion";
import { Skeleton } from "@/components/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import "./NoteStack.css";
import "./NoteStackSkeleton.css";

/** How many placeholder sheets per column — matches the real board's short
 *  columns so the pile occupies about the same space before notes arrive. */
const COLS = [0, 1, 2];
const PER_COL = 2;

/**
 * The loading state of the clipboard: torn-paper sheets in the same cascading
 * columns as <NoteStack>, each with the real card's structure — torn top edge,
 * ring-binding trace, title, preview lines, tag + date, action slots. Sheets
 * ease in with a gentle stagger; static under reduced motion.
 */
export function NoteStackSkeleton() {
  const reduce = useReducedMotion();
  return (
    <div className="note-stack note-stack--skeleton" aria-hidden="true">
      <div className="note-stack__scroll">
        {COLS.map((col) => (
          <div
            className="note-stack__col"
            key={col}
            style={{ "--col": String(col) } as React.CSSProperties}
          >
            {Array.from({ length: PER_COL }).map((_, i) => {
              const step = col * PER_COL + i;
              return (
                <m.div
                  key={i}
                  className="note-skeleton-sheet"
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: 0.4, delay: step * 0.05, ease: [0.22, 1, 0.36, 1] }
                  }
                >
                  <span className="note-skeleton-sheet__tear" aria-hidden="true" />
                  <Skeleton className="note-skeleton-sheet__title" height="1.05rem" width="66%" />
                  <div className="note-skeleton-sheet__lines">
                    <Skeleton height="0.7rem" />
                    <Skeleton height="0.7rem" width="92%" />
                    <Skeleton height="0.7rem" width="58%" />
                  </div>
                  <div className="note-skeleton-sheet__foot">
                    <div className="note-skeleton-sheet__meta">
                      <Skeleton height="1.15rem" width="3.5rem" radius="var(--radius-pill)" />
                      <Skeleton height="0.7rem" width="2.75rem" />
                    </div>
                    <div className="note-skeleton-sheet__actions">
                      <Skeleton height="1.75rem" width="1.75rem" radius="var(--radius-sm)" />
                      <Skeleton height="1.75rem" width="1.75rem" radius="var(--radius-sm)" />
                    </div>
                  </div>
                </m.div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
