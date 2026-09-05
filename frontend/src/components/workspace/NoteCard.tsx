import { useId, useState } from "react";
import { m } from "framer-motion";
import type { Note } from "@shared/types";
import { Chip, IconButton } from "@/components/ui";
import { useNoteTilt } from "@/hooks/useNoteTilt";
import { formatRelativeDate } from "@/utils/date";
import "./NoteCard.css";

interface NoteCardProps {
  note: Note;
  view: "grid" | "list";
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  deleting?: boolean;
}

export function NoteCard({ note, view, onEdit, onDelete, deleting }: NoteCardProps) {
  const tilt = useNoteTilt();
  const [open, setOpen] = useState(false);
  const textId = useId();

  return (
    <m.article
      className="note-card"
      data-view={view}
      data-open={open || undefined}
      aria-busy={deleting || undefined}
      style={tilt.style}
      {...tilt.handlers}
    >
      <div className="note-card__sheet">
        <button
          type="button"
          className="note-card__reader"
          aria-expanded={open}
          aria-controls={textId}
          onClick={() => setOpen((v) => !v)}
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
            <IconButton icon="pencil" label={`Edit note: ${note.title}`} size="sm" onClick={() => onEdit(note)} />
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
      </div>
    </m.article>
  );
}
