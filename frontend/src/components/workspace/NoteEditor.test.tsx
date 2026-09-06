import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domMax } from "framer-motion";
import { describe, expect, it, vi } from "vitest";
import type { Note } from "@shared/types";
import { NoteEditor } from "./NoteEditor";

const note: Note = {
  _id: "n1",
  user: "u",
  title: "Standup",
  description: "shipped the thing",
  tag: "Work",
  date: "2024-01-01",
};

const rect = new DOMRect(100, 100, 260, 160);

function mount() {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <LazyMotion features={domMax} strict>
      <NoteEditor note={note} from={rect} onSave={onSave} onClose={onClose} />
    </LazyMotion>,
  );
  return { onSave, onClose };
}

describe("NoteEditor", () => {
  it("edits on a notebook page — labelled title and body, no old modal", () => {
    mount();
    expect(screen.getByRole("dialog", { name: /edit note: standup/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^title$/i)).toHaveValue("Standup");
    expect(screen.getByLabelText(/^note$/i).tagName).toBe("TEXTAREA");
  });

  it("Save changes hands the edit up, then folds away", async () => {
    const user = userEvent.setup({ delay: null });
    const { onSave, onClose } = mount();
    await user.type(screen.getByLabelText(/^note$/i), " today");
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    expect(onSave).toHaveBeenCalledWith("n1", "Standup", "shipped the thing today", "Work");
    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 4000 });
  });

  it("Discard closes without saving", async () => {
    const user = userEvent.setup({ delay: null });
    const { onSave, onClose } = mount();
    await user.type(screen.getByLabelText(/^note$/i), " nope");
    await user.click(screen.getByRole("button", { name: /discard/i }));
    expect(onSave).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 4000 });
  });
});
