import { useEffect, useState, type ChangeEvent } from "react";
import type { Note } from "@shared/types";
import { Button, Field, Modal, Skeleton } from "@/components/ui";
import { Stagger } from "@/components/motion";
import { useNotes } from "@/context/NotesContext";
import { useToast } from "@/context/ToastContext";
import NoteItem from "./NoteItem";
import AddNote from "./AddNote";
import "./Notes.css";

interface EditForm {
  id: string;
  title: string;
  description: string;
  tag: string;
}

export default function Notes() {
  const { notes, status, getNotes, editNote } = useNotes();
  const toast = useToast();
  const [edit, setEdit] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getNotes();
  }, [getNotes]);

  const beginEdit = (note: Note) =>
    setEdit({ id: note._id, title: note.title, description: note.description, tag: note.tag });

  const submitEdit = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      await editNote(edit.id, edit.title, edit.description, edit.tag || "General");
      setEdit(null);
      toast.success("Note updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update note");
    } finally {
      setSaving(false);
    }
  };

  const onEditChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEdit((prev) => (prev ? { ...prev, [e.target.name]: e.target.value } : prev));

  const editInvalid = !edit || edit.title.trim().length < 3 || edit.description.trim().length < 3;

  return (
    <div className="notes">
      <AddNote />

      <section className="notes__list" aria-labelledby="notes-heading">
        <h2 id="notes-heading" className="notes__heading">
          {status === "ready" && notes.length === 0 ? "No notes yet" : "Your notes"}
        </h2>

        {status === "loading" && (
          <div className="notes__grid" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="notes__skeleton">
                <Skeleton height="1.1rem" width="70%" />
                <Skeleton height="0.8rem" />
                <Skeleton height="0.8rem" width="85%" />
              </div>
            ))}
          </div>
        )}

        {status === "error" && (
          <p className="notes__state">Couldn't load your notes. Refresh to try again.</p>
        )}

        {status === "ready" && notes.length === 0 && (
          <p className="notes__state">Your desk is clear — add your first note above.</p>
        )}

        {notes.length > 0 && (
          <Stagger as="div" className="notes__grid" onView={false}>
            {notes.map((note) => (
              <NoteItem key={note._id} note={note} onEdit={beginEdit} />
            ))}
          </Stagger>
        )}
      </section>

      {edit && (
        <Modal
          open
          onClose={() => setEdit(null)}
          title="Edit note"
          footer={
            <>
              <Button variant="ghost" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={submitEdit} loading={saving} disabled={editInvalid}>
                Save changes
              </Button>
            </>
          }
        >
          <div className="notes__edit-form">
            <Field label="Title" name="title" value={edit.title} onChange={onEditChange} required />
            <Field label="Tag" name="tag" value={edit.tag} onChange={onEditChange} />
            <Field
              as="textarea"
              label="Description"
              name="description"
              value={edit.description}
              onChange={onEditChange}
              required
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
