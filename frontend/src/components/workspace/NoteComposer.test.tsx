import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domAnimation } from "framer-motion";
import { describe, expect, it, vi } from "vitest";
import { NotesContext, type NotesContextValue } from "@/context/NotesContext";
import { ToastProvider } from "@/context/ToastContext";
import { NoteComposer } from "./NoteComposer";

function mount(addNote = vi.fn().mockResolvedValue(undefined)) {
  const notes: NotesContextValue = {
    notes: [],
    status: "ready",
    error: null,
    getNotes: vi.fn(),
    addNote,
    editNote: vi.fn(),
    deleteNote: vi.fn(),
  };
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <LazyMotion features={domAnimation} strict>
        <ToastProvider>
          <NotesContext.Provider value={notes}>
            <NoteComposer open={open} onOpenChange={setOpen} />
          </NotesContext.Provider>
        </ToastProvider>
      </LazyMotion>
    );
  }
  return render(<Harness />);
}

describe("NoteComposer", () => {
  it("starts collapsed and expands to the writing sheet on click", async () => {
    mount();
    expect(screen.queryByLabelText(/^title$/i)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /write a note/i }));
    expect(screen.getByLabelText(/^title$/i)).toBeInTheDocument();
  });

  it("submits a trimmed note, defaults the tag, and collapses", async () => {
    const addNote = vi.fn().mockResolvedValue(undefined);
    mount(addNote);
    await userEvent.click(screen.getByRole("button", { name: /write a note/i }));
    await userEvent.type(screen.getByLabelText(/^title$/i), "  Groceries  ");
    await userEvent.type(screen.getByLabelText(/^note$/i), "milk, eggs");
    await userEvent.click(screen.getByRole("button", { name: /add note/i }));
    expect(addNote).toHaveBeenCalledWith("Groceries", "milk, eggs", "General");
    expect(await screen.findByRole("button", { name: /write a note/i })).toBeInTheDocument();
  });
});
