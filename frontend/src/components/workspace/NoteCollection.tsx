import type { Note } from "@shared/types";
import { Stagger } from "@/components/motion";
import { NoteCard } from "./NoteCard";
import type { ViewMode } from "./NoteToolbar";
import "./NoteCollection.css";

interface NoteCollectionProps {
  notes: Note[];
  view: ViewMode;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  deletingId: string | null;
}

export function NoteCollection({ notes, view, onEdit, onDelete, deletingId }: NoteCollectionProps) {
  return (
    <Stagger as="div" className={`note-collection note-collection--${view}`} onView={false} gap={0.04}>
      {notes.map((note) => (
        <Stagger.Item key={note._id}>
          <NoteCard
            note={note}
            view={view}
            onEdit={onEdit}
            onDelete={onDelete}
            deleting={deletingId === note._id}
          />
        </Stagger.Item>
      ))}
    </Stagger>
  );
}
