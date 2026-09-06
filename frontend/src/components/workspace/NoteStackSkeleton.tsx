import { Skeleton } from "@/components/ui";
import "./NoteStack.css";
import "./NoteStackSkeleton.css";

/** Placeholder pile — same column + sheet geometry as the real stack, so
 *  nothing jumps when the notes arrive. */
export function NoteStackSkeleton() {
  return (
    <div className="note-stack note-stack--skeleton" aria-hidden="true">
      {[2, 3, 2, 2].map((count, col) => (
        <div className="note-stack__col" key={col}>
          {Array.from({ length: count }).map((_, i) => (
            <div className="note-skeleton-sheet" key={i}>
              <Skeleton height="1.15rem" width="70%" />
              <div className="note-skeleton-sheet__lines">
                <Skeleton height="0.75rem" />
                <Skeleton height="0.75rem" width="90%" />
                <Skeleton height="0.75rem" width="60%" />
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
  );
}
