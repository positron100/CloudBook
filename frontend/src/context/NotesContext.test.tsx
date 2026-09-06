import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { NotesProvider, useNotes } from "./NotesContext";

vi.mock("@/lib/api");
import * as api from "@/lib/api";

const note = (over = {}) => ({
  _id: "s1",
  user: "u",
  title: "t",
  description: "d",
  tag: "General",
  date: "2024-01-01",
  ...over,
});

const wrapper = ({ children }: { children: ReactNode }) => <NotesProvider>{children}</NotesProvider>;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.fetchNotes).mockResolvedValue([]);
});

describe("NotesContext — optimistic mutations", () => {
  it("adds a note before the API responds, then reconciles the server id", async () => {
    let resolve!: (n: ReturnType<typeof note>) => void;
    vi.mocked(api.addNote).mockReturnValue(new Promise((r) => (resolve = r)));

    const { result } = renderHook(() => useNotes(), { wrapper });

    let committed!: Promise<unknown>;
    act(() => {
      committed = result.current.addNote("Milk", "2%", "Home").committed;
    });
    // present immediately, flagged pending
    expect(result.current.notes).toHaveLength(1);
    expect(result.current.isPending(result.current.notes[0]._id)).toBe(true);

    await act(async () => {
      resolve(note({ _id: "server-9", title: "Milk" }));
      await committed;
    });
    expect(result.current.notes).toHaveLength(1);
    expect(result.current.isPending(result.current.notes[0]._id)).toBe(false);
  });

  it("removes a note immediately and puts it back if the delete fails", async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note({ _id: "s1" }), note({ _id: "s2" })]);
    vi.mocked(api.deleteNote).mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useNotes(), { wrapper });
    await act(async () => {
      await result.current.getNotes();
    });
    expect(result.current.notes).toHaveLength(2);

    let committed!: Promise<unknown>;
    act(() => {
      committed = result.current.deleteNote("s1").committed;
    });
    expect(result.current.notes.map((n) => n._id)).toEqual(["s2"]);

    await act(async () => {
      await committed.catch(() => {});
    });
    // restored at its original index
    await waitFor(() => expect(result.current.notes.map((n) => n._id)).toEqual(["s1", "s2"]));
  });
});
