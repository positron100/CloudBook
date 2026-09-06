import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domMax } from "framer-motion";
import { describe, expect, it, vi } from "vitest";
import type { Note } from "@shared/types";
import { NotesContext, type NotesContextValue } from "@/context/NotesContext";
import { ToastProvider } from "@/context/ToastContext";
import { Notebook } from "./Notebook";

function mount(over: Partial<NotesContextValue> = {}, onCreated = vi.fn()) {
  const created: Note = {
    _id: "n1",
    user: "u",
    title: "Groceries",
    description: "milk, eggs",
    tag: "General",
    date: "2024-01-01",
  };
  const notes: NotesContextValue = {
    notes: [],
    status: "ready",
    error: null,
    getNotes: vi.fn(),
    addNote: vi.fn().mockResolvedValue(created),
    editNote: vi.fn(),
    deleteNote: vi.fn(),
    ...over,
  };
  render(
    <LazyMotion features={domMax} strict>
      <ToastProvider>
        <NotesContext.Provider value={notes}>
          <Notebook onCreated={onCreated} />
        </NotesContext.Provider>
      </ToastProvider>
    </LazyMotion>,
  );
  return { notes, onCreated };
}

describe("Notebook", () => {
  it("writes straight onto the page — labelled title and body, no placeholder-as-label", () => {
    mount();
    expect(screen.getByLabelText(/^title$/i)).toHaveAttribute("placeholder", "Untitled");
    expect(screen.getByLabelText(/^note$/i).tagName).toBe("TEXTAREA");
  });

  it("keeps Add note disabled until title and body are long enough", async () => {
    mount();
    const button = screen.getByRole("button", { name: /tear out/i });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/^title$/i), "Hi");
    await userEvent.type(screen.getByLabelText(/^note$/i), "there");
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/^title$/i), "!");
    expect(button).toBeEnabled();
  });

  it("submits a trimmed note, defaults the tag, and reports the created note", async () => {
    const { notes, onCreated } = mount();
    await userEvent.type(screen.getByLabelText(/^title$/i), "  Groceries  ");
    await userEvent.type(screen.getByLabelText(/^note$/i), "milk, eggs");
    await userEvent.click(screen.getByRole("button", { name: /tear out/i }));
    expect(notes.addNote).toHaveBeenCalledWith("Groceries", "milk, eggs", "General");
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "n1" }),
      expect.any(Object),
    );
    // page cleared for the next note
    expect(screen.getByLabelText(/^title$/i)).toHaveValue("");
  });

  it("keeps the page intact and does not tear on API failure", async () => {
    const { onCreated } = mount({
      addNote: vi.fn().mockRejectedValue(new Error("offline")),
    });
    await userEvent.type(screen.getByLabelText(/^title$/i), "Keep me");
    await userEvent.type(screen.getByLabelText(/^note$/i), "still here");
    await userEvent.click(screen.getByRole("button", { name: /tear out/i }));
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^title$/i)).toHaveValue("Keep me");
  });
});
