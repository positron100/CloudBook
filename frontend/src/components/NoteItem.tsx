import { useState } from "react";
import type { Note } from "@shared/types";
import { useNotes } from "@/context/NotesContext";
import type { ShowAlert } from "@/types/alert";

interface NoteItemProps {
  note: Note;
  updatenote: (note: Note) => void;
  showAlert: ShowAlert;
}

function NoteItem({ note, updatenote, showAlert }: NoteItemProps) {
  const { deleteNote } = useNotes();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteNote(note._id);
      showAlert("Deleted Successfully", "warning");
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Could not delete note", "danger");
    }
  };

  return (
    <div className="col-md-3">
      <div className="card my-3">
        <div className="card-body">
          <h5 className="card-title">{note.title}</h5>
          <p className="card-text">{note.description}</p>
          {note.tag && <span className="badge text-bg-secondary mb-2">{note.tag}</span>}

          <div className="d-flex gap-2 align-items-center">
            <button className="btn btn-link btn-sm px-0" onClick={() => setOpen((o) => !o)}>
              {open ? "Hide" : "View Note"}
            </button>
            <i
              className="fa-solid fa-trash"
              role="button"
              aria-label="Delete note"
              onClick={handleDelete}
            ></i>
            <i
              className="fa-solid fa-pen-to-square"
              role="button"
              aria-label="Edit note"
              onClick={() => updatenote(note)}
            ></i>
          </div>

          {open && (
            <div className="mt-2 border-top pt-2">
              <p className="mb-1">{note.description}</p>
              {note.date && (
                <p className="mb-0 text-secondary small">
                  Added on: {new Date(note.date).toUTCString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NoteItem;
