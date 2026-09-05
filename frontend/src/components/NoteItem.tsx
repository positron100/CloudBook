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

  const handleDelete = async () => {
    try {
      await deleteNote(note._id);
      showAlert("Deleted successfully", "warning");
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
          <i
            className="fa-solid fa-trash"
            role="button"
            aria-label="Delete note"
            onClick={handleDelete}
          ></i>
          <i
            className="fa-solid fa-pen-to-square mx-3"
            role="button"
            aria-label="Edit note"
            onClick={() => updatenote(note)}
          ></i>
        </div>
      </div>
    </div>
  );
}

export default NoteItem;
