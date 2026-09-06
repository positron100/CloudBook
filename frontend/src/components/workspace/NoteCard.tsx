import { useId, type PointerEvent } from "react";
import { m } from "framer-motion";
import type { Note } from "@shared/types";
import { Chip, IconButton } from "@/components/ui";
import { useNoteTilt } from "@/hooks/useNoteTilt";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { formatRelativeDate } from "@/utils/date";
import "./NoteCard.css";

interface NoteCardProps {
  note: Note;
  open: boolean;
  onToggle: () => void;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  deleting?: boolean;
  /** A sibling is open — recede slightly. */
  dimmed?: boolean;
}

const HOVER_SPRING = { type: "spring", stiffness: 320, damping: 28 } as const;

/**
 * A sheet of paper on the desk. Two elements, one job each: the outer owns the
 * resting pose in the pile (rotation/offset from CSS vars set by the parent);
 * the inner owns the hover lift, the pointer tilt and the pick-up when open —
 * so the pile transform and the interaction transform never fight for one
 * matrix. Pointer light rides CSS vars written straight to the node, no React
 * state per move.
 */
export function NoteCard({
  note,
  open,
  onToggle,
  onEdit,
  onDelete,
  deleting,
  dimmed,
}: NoteCardProps) {
  const reduce = useReducedMotion();
  const tilt = useNoteTilt();
  const textId = useId();

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    tilt.handlers.onPointerMove(e);
    if (!tilt.enabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  const lifted = open
    ? { y: -14, scale: 1.03, rotate: 0 }
    : dimmed
      ? { scale: 0.985, opacity: 0.62 }
      : { y: 0, scale: 1, opacity: 1 };

  return (
    <m.article
      className="note-card"
      data-note-id={note._id}
      data-open={open || undefined}
      data-dimmed={dimmed || undefined}
      aria-busy={deleting || undefined}
    >
      <m.div
        className="note-card__sheet"
        onPointerMove={handlePointerMove}
        onPointerLeave={tilt.handlers.onPointerLeave}
        animate={lifted}
        whileHover={reduce || open || dimmed ? undefined : { y: -8, scale: 1.015 }}
        whileTap={reduce ? undefined : { scale: 0.99 }}
        transition={HOVER_SPRING}
        style={tilt.style}
      >
        <span className="note-card__light" aria-hidden="true" />
        <span className="note-card__tear" aria-hidden="true" />
        <span className="note-card__binding" aria-hidden="true" />

        <button
          type="button"
          className="note-card__reader"
          aria-expanded={open}
          aria-controls={textId}
          onClick={onToggle}
        >
          <h3 className="note-card__title">{note.title}</h3>
          <p id={textId} className="note-card__preview" data-open={open || undefined}>
            {note.description}
          </p>
        </button>

        <div className="note-card__foot">
          <div className="note-card__meta">
            {note.tag && <Chip tone="accent">{note.tag}</Chip>}
            {note.date && (
              <time className="note-card__date" dateTime={note.date}>
                {formatRelativeDate(note.date)}
              </time>
            )}
          </div>
          <div className="note-card__icons">
            <IconButton
              icon="pencil"
              label={`Edit note: ${note.title}`}
              size="sm"
              onClick={() => onEdit(note)}
            />
            <IconButton
              icon="trash"
              label={`Delete note: ${note.title}`}
              size="sm"
              variant="danger"
              disabled={deleting}
              onClick={() => onDelete(note)}
            />
          </div>
        </div>
      </m.div>
    </m.article>
  );
}
