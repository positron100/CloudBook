import { m, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import type { Note } from "@shared/types";
import { Chip } from "@/components/ui";
import { formatRelativeDate } from "@/utils/date";

interface NoteFaceProps {
  note: Note;
  /** Fades just the written content (not the paper) — used by the return fold. */
  contentOpacity?: MotionValue<number>;
  /** 0 (fully written) → 1 (fully erased). Clips the content away from the
   *  bottom up — the reverse of how it was written top-down — rather than
   *  fading it. Used by the delete return trip. */
  eraseProgress?: MotionValue<number>;
  /** Ruled lines that fade in as the content erases — so the sheet still
   *  reads as paper, not a blank card, while it carries no text. Used by the
   *  delete return trip only. */
  ruledOpacity?: MotionValue<number>;
}

/**
 * The non-interactive face of a note card — pixel-identical to what NoteCard
 * paints (same `.note-card__*` classes, same paper, torn edge, clamp, foot),
 * minus the reader button and the icon controls. The flying TearSheet /
 * ReturnSheet render this, so the frame where the sheet becomes the real card
 * has nothing to swap.
 */
export function NoteFace({
  note,
  contentOpacity,
  eraseProgress,
  ruledOpacity,
}: NoteFaceProps) {
  // Bottom-up clip: at 0 nothing is clipped; at 1 the whole block is clipped
  // away. Erasing from the bottom edge up reads as the reverse of writing
  // (which fills top-down) — a shrinking window of visible text, not a fade.
  const fallbackErase = useMotionValue(0);
  const clipPath = useTransform(
    eraseProgress ?? fallbackErase,
    (p) => `inset(0 0 ${Math.round(p * 100)}% 0)`,
  );
  return (
    <div className="note-card__sheet note-card__sheet--face">
      <span className="note-card__tear" aria-hidden="true" />
      {ruledOpacity && (
        <m.span
          className="note-card__ruled"
          aria-hidden="true"
          style={{ opacity: ruledOpacity }}
        />
      )}
      <m.div
        className="note-card__face-content"
        style={{
          opacity: contentOpacity,
          clipPath: eraseProgress ? clipPath : undefined,
        }}
      >
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
