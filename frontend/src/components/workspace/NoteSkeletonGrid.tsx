import { Skeleton } from "@/components/ui";
import type { ViewMode } from "./NoteToolbar";
import "./NoteSkeletonGrid.css";

/** Placeholder collection matching the real card geometry to avoid layout shift. */
export function NoteSkeletonGrid({ view, count = 6 }: { view: ViewMode; count?: number }) {
  return (
    <div className={`note-skeletons note-skeletons--${view}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="note-skeletons__card">
          <Skeleton height="1.05rem" width="65%" />
          <div className="note-skeletons__lines">
            <Skeleton height="0.8rem" />
            <Skeleton height="0.8rem" width="88%" />
            {view === "grid" && <Skeleton height="0.8rem" width="72%" />}
          </div>
          <div className="note-skeletons__foot">
            <Skeleton height="1.1rem" width="3.5rem" radius="var(--radius-pill)" />
            <Skeleton height="0.7rem" width="3rem" />
          </div>
        </div>
      ))}
    </div>
  );
}
