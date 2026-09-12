import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { NotesProvider, useNotes } from "./NotesContext";
import { AuthProvider } from "./AuthContext";

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

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>
    <NotesProvider>{children}</NotesProvider>
  </AuthProvider>
);

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

describe("NotesContext — resilience", () => {
  it("keeps existing notes on screen when a background refresh fails", async () => {
    vi.mocked(api.fetchNotes).mockResolvedValueOnce([note({ _id: "s1" }), note({ _id: "s2" })]);

    const { result } = renderHook(() => useNotes(), { wrapper });
    await act(async () => {
      await result.current.getNotes();
    });
    expect(result.current.notes).toHaveLength(2);
    expect(result.current.status).toBe("ready");

    // A later refresh (e.g. triggered on tab resume) that fails must not
    // wipe the collection that's already on screen.
    vi.mocked(api.fetchNotes).mockRejectedValueOnce(new Error("Network error"));
    await act(async () => {
      await result.current.getNotes();
    });

    expect(result.current.notes.map((n) => n._id)).toEqual(["s1", "s2"]);
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBeTruthy();
  });
});

describe("NotesContext — cache-fill vs write-through race", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("never overwrites an existing cache with [] while the user id is still resolving", async () => {
    const cacheKey = "cloudbook:notes:user-1";
    localStorage.setItem("token", "fake-token");
    localStorage.setItem(cacheKey, JSON.stringify([note({ _id: "cached-1", title: "Cached note" })]));

    // Every localStorage write from here on is recorded, so we can prove no
    // call ever wrote `[]` for this user's key — not just that the *final*
    // value is correct, which the render-time fix's whole point is to
    // guarantee even for the transient value.
    const writes: Array<{ key: string; value: string }> = [];
    const originalSetItem = Storage.prototype.setItem.bind(localStorage);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key: string, value: string) => {
      writes.push({ key, value });
      originalSetItem(key, value);
    });

    // getuser resolves on our command — this is what lets `userId` become
    // known on a render where `notes` is still whatever it started as.
    let resolveGetUser!: (u: { _id: string; name: string; email: string; date: string }) => void;
    vi.mocked(api.getUser).mockReturnValue(
      new Promise((r) => {
        resolveGetUser = r;
      }),
    );
    // The real notes fetch stays pending too, so `notes` is still `[]` at the
    // exact moment the user id resolves — the precise window the race lives in.
    vi.mocked(api.fetchNotes).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useNotes(), { wrapper });

    await act(async () => {
      resolveGetUser({ _id: "user-1", name: "Ada", email: "ada@example.com", date: "2024-01-01" });
      // let the resulting state updates (and any effects they trigger) flush
      await Promise.resolve();
      await Promise.resolve();
    });

    // The cached note must have been backfilled into the visible state...
    expect(result.current.notes.map((n) => n._id)).toEqual(["cached-1"]);
    // ...and at no point should the on-disk cache for this user have been
    // observed holding an empty array.
    const badWrite = writes.find((w) => w.key === cacheKey && w.value === "[]");
    expect(badWrite).toBeUndefined();
    // The cache must still hold the real data, not have ended up cleared.
    expect(JSON.parse(localStorage.getItem(cacheKey) ?? "null")).toEqual([
      note({ _id: "cached-1", title: "Cached note" }),
    ]);
  });
});
