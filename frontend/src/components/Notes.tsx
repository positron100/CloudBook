import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { Note } from "@shared/types";
import { useNotes } from "@/context/NotesContext";
import NoteItem from "./NoteItem";
import AddNote from "./AddNote";
import type { ShowAlert } from "@/types/alert";

interface EditForm {
  id: string;
  etitle: string;
  edescription: string;
  etag: string;
}

function Notes({ showAlert }: { showAlert: ShowAlert }) {
  const { notes, status, getNotes, editNote } = useNotes();

  useEffect(() => {
    // The route is gated by <RequireAuth>, so we're always authenticated here.
    void getNotes();
  }, [getNotes]);

  const openModalRef = useRef<HTMLButtonElement>(null);
  const closeModalRef = useRef<HTMLButtonElement>(null);
  const [form, setForm] = useState<EditForm>({ id: "", etitle: "", edescription: "", etag: "General" });

  const beginEdit = (note: Note) => {
    setForm({ id: note._id, etitle: note.title, edescription: note.description, etag: note.tag });
    openModalRef.current?.click();
  };

  const submitEdit = async () => {
    try {
      await editNote(form.id, form.etitle, form.edescription, form.etag);
      closeModalRef.current?.click();
      showAlert("Updates Successfully", "success");
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Could not update note", "danger");
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <>
      <AddNote showAlert={showAlert} />

      {/* Hidden trigger — beginEdit() clicks it to open the Bootstrap modal. */}
      <button
        type="button"
        className="btn btn-primary d-none"
        data-bs-toggle="modal"
        data-bs-target="#editNoteModal"
        ref={openModalRef}
      >
        Open edit modal
      </button>

      <div className="modal fade" id="editNoteModal" tabIndex={-1} aria-labelledby="editNoteModalLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="editNoteModalLabel">
                Edit Note
              </h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form>
                <div className="mb-3">
                  <label htmlFor="etitle" className="col-form-label">
                    Title:
                  </label>
                  <input type="text" className="form-control" id="etitle" name="etitle" value={form.etitle} onChange={onChange} />
                </div>
                <div className="mb-3">
                  <label htmlFor="etag" className="col-form-label">
                    Tag:
                  </label>
                  <input type="text" className="form-control" id="etag" name="etag" value={form.etag} onChange={onChange} />
                </div>
                <div className="mb-3">
                  <label htmlFor="edescription" className="col-form-label">
                    Description:
                  </label>
                  <textarea className="form-control" id="edescription" name="edescription" value={form.edescription} onChange={onChange}></textarea>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" ref={closeModalRef}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={form.etitle.length < 3 || form.edescription.length < 3}
                onClick={submitEdit}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row my-3 mx-0">
        <h2>{notes.length === 0 ? "No notes to display" : "Your Notes"}</h2>
        <div className="container my-2 mx-1">
          {status === "loading" && "Loading your notes…"}
          {status === "error" && "Could not load your notes. Refresh to try again."}
        </div>
        {notes.map((note) => (
          <NoteItem key={note._id} note={note} updatenote={beginEdit} showAlert={showAlert} />
        ))}
      </div>
    </>
  );
}

export default Notes;
