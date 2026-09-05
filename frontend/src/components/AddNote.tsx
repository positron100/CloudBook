import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNotes } from "@/context/NotesContext";
import type { ShowAlert } from "@/types/alert";

const AddNote = ({ showAlert }: { showAlert: ShowAlert }) => {
  const { addNote } = useNotes();
  const [note, setNote] = useState({ title: "", description: "", tag: "General" });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await addNote(note.title, note.description, note.tag || "General");
      setNote({ title: "", description: "", tag: "General" });
      showAlert("Added Successfully", "success");
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Could not add note", "danger");
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNote({ ...note, [e.target.name]: e.target.value });
  };

  const reset = (field: "title" | "description") => setNote({ ...note, [field]: "" });

  return (
    <>
      <div className="container my-3">
        <h2>Add a Note</h2>
      </div>
      <form className="container" onSubmit={handleSubmit}>
        <div className="mb-3 my-3">
          <label htmlFor="title" className="form-label">
            Title
          </label>
          <input
            type="text"
            className="form-control"
            onChange={onChange}
            value={note.title}
            id="title"
            name="title"
            aria-describedby="titleHelp"
          />
          <button type="button" className="btn btn-link btn-sm px-0" onClick={() => reset("title")}>
            Reset title
          </button>
        </div>
        <div className="mb-3">
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <input
            type="text"
            className="form-control"
            id="description"
            onChange={onChange}
            value={note.description}
            name="description"
          />
          <button
            type="button"
            className="btn btn-link btn-sm px-0"
            onClick={() => reset("description")}
          >
            Reset description
          </button>
        </div>
        <div className="mb-3">
          <label htmlFor="tag" className="form-label">
            Tag
          </label>
          <input
            type="text"
            className="form-control"
            id="tag"
            onChange={onChange}
            value={note.tag}
            name="tag"
          />
        </div>

        <button
          disabled={note.title.length < 3 || note.description.length < 3}
          type="submit"
          className="btn btn-primary"
        >
          Add Note
        </button>
      </form>
    </>
  );
};

export default AddNote;
