import { Skeleton } from "@/components/ui";
import "./NoteToolbar.css";
import "./NoteToolbarSkeleton.css";

/** Placeholder for <NoteToolbar> — holds the same row height so the desk below
 *  does not shift down when the real search + tag controls arrive. */
export function NoteToolbarSkeleton() {
  return (
    <div className="note-toolbar note-toolbar--skeleton" aria-hidden="true">
      <Skeleton
        className="note-toolbar__search-skeleton"
        height="var(--control-h)"
        radius="var(--radius-pill)"
      />
      <div className="note-toolbar__tags">
        <Skeleton height="2rem" width="3.25rem" radius="var(--radius-pill)" />
        <Skeleton height="2rem" width="4rem" radius="var(--radius-pill)" />
        <Skeleton height="2rem" width="2.5rem" radius="var(--radius-pill)" />
      </div>
    </div>
  );
}
