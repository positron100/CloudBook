import { Skeleton } from "@/components/ui";
import "./NoteStack.css";
import "./NoteStackSkeleton.css";

/** Placeholder pile — the board's column + sheet geometry, so nothing jumps
 *  when the notes arrive. */
export function NoteStackSkeleton() {
  return (
    <div className="note-stack note-stack--skeleton" aria-hidden="true">
      <div className="note-stack__scroll">
        {[0, 1, 2].map((col) => (
          <div className="note-stack__col" key={col} style={{ "--col": String(col) } as React.CSSProperties}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div className="note-skeleton-sheet" key={i}>
                <Skeleton height="1.15rem" width="72%" />
                <div className="note-skeleton-sheet__lines">
                  <Skeleton height="0.75rem" />
                  <Skeleton height="0.75rem" width="88%" />
                  <Skeleton height="0.75rem" width="55%" />
                </div>
                <div className="note-skeleton-sheet__foot">
                  <Skeleton height="1.1rem" width="3.5rem" radius="var(--radius-pill)" />
                  <Skeleton height="0.7rem" width="3rem" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
