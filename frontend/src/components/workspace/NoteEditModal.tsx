import { useEffect, useState, type ChangeEvent } from "react";
import type { Note } from "@shared/types";
import { Button, Field, Modal } from "@/components/ui";
import "./NoteEditModal.css";

interface NoteEditModalProps {
  note: Note | null;
  onClose: () => void;
  onSave: (id: string, title: string, description: string, tag: string) => Promise<void>;
}

export function NoteEditModal({ note, onClose, onSave }: NoteEditModalProps) {
  const [form, setForm] = useState({ title: "", description: "", tag: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (note) setForm({ title: note.title, description: note.description, tag: note.tag });
  }, [note]);

  if (!note) return null;

  const invalid = form.title.trim().length < 3 || form.description.trim().length < 3;

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(note._id, form.title.trim(), form.description.trim(), form.tag.trim() || "General");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit note"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={saving} disabled={invalid}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="note-edit">
        <Field label="Title" name="title" value={form.title} onChange={onChange} required />
        <Field label="Tag" name="tag" value={form.tag} onChange={onChange} />
        <Field
          as="textarea"
          label="Note"
          name="description"
          value={form.description}
          onChange={onChange}
          required
        />
      </div>
    </Modal>
  );
}
