import { useState } from "react";
import type { Note } from "@shared/types";
import { Card, Chip, IconButton } from "@/components/ui";
import { Stagger } from "@/components/motion";
import { useNotes } from "@/context/NotesContext";
import { useToast } from "@/context/ToastContext";
import "./NoteItem.css";

interface NoteItemProps {
  note: Note;
  onEdit: (note: Note) => void;
}

export default function NoteItem({ note, onEdit }: NoteItemProps) {
  const { deleteNote } = useNotes();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteNote(note._id);
      toast.warning("Note deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete note");
      setBusy(false);
    }
  };

  return (
    <Stagger.Item>
      <Card className="note-item" aria-busy={busy || undefined}>
        <div className="note-item__body">
          <h3 className="note-item__title">{note.title}</h3>
          <p className="note-item__preview">{note.description}</p>
        </div>

        {open && (
          <div className="note-item__detail">
            <p>{note.description}</p>
            {note.date && (
              <p className="note-item__date">Added {new Date(note.date).toLocaleDateString()}</p>
            )}
          </div>
        )}

        <div className="note-item__foot">
          {note.tag && <Chip tone="accent">{note.tag}</Chip>}
          <div className="note-item__actions">
            <button type="button" className="note-item__view" onClick={() => setOpen((v) => !v)}>
              {open ? "Hide" : "View"}
            </button>
            <IconButton icon="pencil" label="Edit note" size="sm" onClick={() => onEdit(note)} />
            <IconButton
              icon="trash"
              label="Delete note"
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={handleDelete}
            />
          </div>
        </div>
      </Card>
    </Stagger.Item>
  );
}
