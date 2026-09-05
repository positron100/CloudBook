import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button, Field, Surface } from "@/components/ui";
import { useNotes } from "@/context/NotesContext";
import { useToast } from "@/context/ToastContext";
import "./AddNote.css";

const EMPTY = { title: "", description: "", tag: "General" };

export default function AddNote() {
  const { addNote } = useNotes();
  const toast = useToast();
  const [note, setNote] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const invalid = note.title.trim().length < 3 || note.description.trim().length < 3;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addNote(note.title, note.description, note.tag || "General");
      setNote(EMPTY);
      toast.success("Note added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add note");
    } finally {
      setSubmitting(false);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) =>
    setNote({ ...note, [e.target.name]: e.target.value });

  return (
    <Surface level={2} as="section" className="add-note" aria-labelledby="add-note-heading">
      <h2 id="add-note-heading" className="add-note__heading">
        New note
      </h2>
      <form className="add-note__form" onSubmit={handleSubmit}>
        <Field label="Title" name="title" value={note.title} onChange={onChange} required />
        <Field label="Description" name="description" value={note.description} onChange={onChange} required />
        <Field label="Tag" name="tag" value={note.tag} onChange={onChange} hint="Optional — groups notes together." />
        <div className="add-note__actions">
          <Button type="button" variant="ghost" size="sm" onClick={() => setNote(EMPTY)}>
            Clear
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={invalid}>
            Add note
          </Button>
        </div>
      </form>
    </Surface>
  );
}
