import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button, Field, Icon, Surface } from "@/components/ui";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { down } from "@/utils/breakpoints";
import { useNotes } from "@/context/NotesContext";
import { useToast } from "@/context/ToastContext";
import "./NoteComposer.css";

const EMPTY = { title: "", description: "", tag: "" };

export function NoteComposer() {
  const { addNote } = useNotes();
  const toast = useToast();
  const isCompact = useMediaQuery(down("lg"));
  const [note, setNote] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  // On narrow screens the form starts collapsed so the notes stay primary.
  const [open, setOpen] = useState(false);

  const invalid = note.title.trim().length < 3 || note.description.trim().length < 3;
  const dirty = Boolean(note.title || note.description || note.tag);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addNote(note.title.trim(), note.description.trim(), note.tag.trim() || "General");
      setNote(EMPTY);
      if (isCompact) setOpen(false);
      toast.success("Note added to your desk");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add note");
    } finally {
      setSubmitting(false);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setNote({ ...note, [e.target.name]: e.target.value });

  if (isCompact && !open) {
    return (
      <Button variant="primary" block lift onClick={() => setOpen(true)} className="composer__open">
        <Icon name="plus" size={18} />
        New note
      </Button>
    );
  }

  return (
    <Surface level={2} as="section" className="composer" aria-labelledby="composer-heading">
      <div className="composer__head">
        <span className="composer__head-left">
          <Icon name="sparkle" size={18} className="composer__glyph" />
          <h2 id="composer-heading" className="composer__heading">
            New note
          </h2>
        </span>
        {isCompact && (
          <button
            type="button"
            className="composer__collapse"
            aria-label="Collapse"
            onClick={() => {
              setNote(EMPTY);
              setOpen(false);
            }}
          >
            <Icon name="x" size={18} />
          </button>
        )}
      </div>
      <form className="composer__form" onSubmit={handleSubmit}>
        <Field
          id="composer-title"
          label="Title"
          name="title"
          placeholder="A short heading"
          value={note.title}
          onChange={onChange}
          required
        />
        <Field
          as="textarea"
          label="Note"
          name="description"
          placeholder="Write it down before it's gone…"
          value={note.description}
          onChange={onChange}
          required
        />
        <Field
          label="Tag"
          name="tag"
          placeholder="General"
          value={note.tag}
          onChange={onChange}
          hint="Groups related notes together."
        />
        <div className="composer__actions">
          {dirty && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setNote(EMPTY)}>
              Clear
            </Button>
          )}
          <Button type="submit" variant="primary" loading={submitting} disabled={invalid}>
            Add note
          </Button>
        </div>
      </form>
    </Surface>
  );
}
