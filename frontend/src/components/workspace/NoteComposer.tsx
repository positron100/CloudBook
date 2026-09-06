import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Button, Field, Icon, Surface } from "@/components/ui";
import { Magnetic } from "@/components/motion";
import { useNotes } from "@/context/NotesContext";
import { useToast } from "@/context/ToastContext";
import "./NoteComposer.css";

const EMPTY = { title: "", description: "", tag: "" };

interface NoteComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Collapsed: a glass "Write a note…" bar. Open: an elevated paper writing
 *  sheet, inline in the column. Native inputs throughout — no contenteditable. */
export function NoteComposer({ open, onOpenChange }: NoteComposerProps) {
  const { addNote } = useNotes();
  const toast = useToast();
  const [note, setNote] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const invalid = note.title.trim().length < 3 || note.description.trim().length < 3;
  const dirty = Boolean(note.title || note.description || note.tag);

  useEffect(() => {
    if (open) document.getElementById("composer-title")?.focus();
  }, [open]);

  const close = () => {
    setNote(EMPTY);
    onOpenChange(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addNote(note.title.trim(), note.description.trim(), note.tag.trim() || "General");
      setNote(EMPTY);
      onOpenChange(false);
      toast.success("Note added to your desk");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add note");
    } finally {
      setSubmitting(false);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setNote({ ...note, [e.target.name]: e.target.value });

  if (!open) {
    return (
      <Magnetic strength={4} className="composer-trigger__magnet">
        <button
          id="composer-open"
          type="button"
          className="composer-trigger"
          onClick={() => onOpenChange(true)}
        >
          <Icon name="plus" size={18} className="composer-trigger__icon" />
          <span className="composer-trigger__label">Write a note…</span>
        </button>
      </Magnetic>
    );
  }

  return (
    <Surface level={3} as="section" className="composer" aria-labelledby="composer-heading">
      <div className="composer__head">
        <span className="composer__head-left">
          <Icon name="sparkle" size={18} className="composer__glyph" />
          <h2 id="composer-heading" className="composer__heading">
            New note
          </h2>
        </span>
        <button type="button" className="composer__collapse" aria-label="Close" onClick={close}>
          <Icon name="x" size={18} />
        </button>
      </div>
      <form className="composer__form" onSubmit={handleSubmit}>
        <Field
          id="composer-title"
          label="Title"
          name="title"
          placeholder="Untitled"
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
