import { m, type MotionValue } from "framer-motion";
import type { Note } from "@shared/types";
import { Chip } from "@/components/ui";
import { formatRelativeDate } from "@/utils/date";

interface NoteFaceProps {
  note: Note;
  /** Fades just the written content (not the paper) — used by the return fold. */
  contentOpacity?: MotionValue<number>;
}

/**
 * The non-interactive face of a note card — pixel-identical to what NoteCard
 * paints (same `.note-card__*` classes, same paper, torn edge, clamp, foot),
 * minus the reader button and the icon controls. The flying TearSheet /
 * ReturnSheet render this, so the frame where the sheet becomes the real card
 * has nothing to swap.
 */
export function NoteFace({ note, contentOpacity }: NoteFaceProps) {
  return (
    <div className="note-card__sheet note-card__sheet--face">
      <span className="note-card__tear" aria-hidden="true" />
      <span className="note-card__binding" aria-hidden="true" />
      <m.div className="note-card__face-content" style={{ opacity: contentOpacity }}>
        <div className="note-card__reader" aria-hidden="true">
          <h3 className="note-card__title">{note.title}</h3>
          <p className="note-card__preview">{note.description}</p>
        </div>
        <div className="note-card__foot">
          <div className="note-card__meta">
            {note.tag && <Chip tone="accent">{note.tag}</Chip>}
            {note.date && (
              <time className="note-card__date" dateTime={note.date}>
                {formatRelativeDate(note.date)}
              </time>
            )}
          </div>
          <div className="note-card__icons" aria-hidden="true" />
        </div>
      </m.div>
    </div>
  );
}
