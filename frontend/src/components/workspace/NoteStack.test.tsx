import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domMax } from "framer-motion";
import { describe, expect, it, vi } from "vitest";
import type { Note } from "@shared/types";
import { NoteStack } from "./NoteStack";

const notes: Note[] = ["Alpha", "Beta", "Gamma", "Delta"].map((title, i) => ({
  _id: `n${i}`,
  user: "u",
  title,
  description: `${title} body text`,
  tag: "General",
  date: "2024-01-01",
}));

function mount(props: Partial<React.ComponentProps<typeof NoteStack>> = {}) {
  const handlers = {
    onToggle: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <LazyMotion features={domMax} strict>
      <NoteStack
        notes={notes}
        openId={null}
        deletingId={null}
        {...handlers}
        {...props}
      />
    </LazyMotion>,
  );
  return handlers;
}

describe("NoteStack", () => {
  it("renders every note as a sheet with title and preview", () => {
    mount();
    for (const note of notes) {
      expect(screen.getByRole("heading", { name: note.title })).toBeInTheDocument();
    }
  });

  it("toggles a note open from its reader button", async () => {
    const { onToggle } = mount();
    await userEvent.click(screen.getByRole("heading", { name: "Alpha" }).closest("button")!);
    expect(onToggle).toHaveBeenCalledWith("n0");
  });

  it("marks siblings dimmed and the open note expanded when one is open", () => {
    mount({ openId: "n1" });
    const open = screen.getByRole("heading", { name: "Beta" }).closest(".note-card")!;
    const other = screen.getByRole("heading", { name: "Alpha" }).closest(".note-card")!;
    expect(open).toHaveAttribute("data-open");
    expect(other).toHaveAttribute("data-dimmed");
    expect(screen.getByRole("heading", { name: "Beta" }).closest("button")!).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("exposes edit and delete actions per sheet", async () => {
    const { onDelete } = mount();
    const card = screen.getByRole("heading", { name: "Gamma" }).closest(".note-card")!;
    await userEvent.click(within(card as HTMLElement).getByRole("button", { name: /delete note/i }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ _id: "n2" }));
  });
});
