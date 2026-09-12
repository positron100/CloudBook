import { describe, expect, it, beforeEach } from "vitest";
import { clearNotesCache, readNotesCache, writeNotesCache } from "./notesCache";
import type { Note } from "@shared/types";

const note = (over: Partial<Note> = {}): Note => ({
  _id: "n1",
  user: "user-A",
  title: "t",
  description: "d",
  tag: "General",
  date: "2024-01-01",
  ...over,
});

beforeEach(() => {
  localStorage.clear();
});

describe("notesCache", () => {
  it("round-trips notes for a user", () => {
    writeNotesCache("user-A", [note()]);
    expect(readNotesCache("user-A")).toEqual([note()]);
  });

  it("returns null when nothing is cached", () => {
    expect(readNotesCache("user-nobody")).toBeNull();
  });

  it("keeps two users' caches completely separate", () => {
    writeNotesCache("user-A", [note({ _id: "a1", title: "A's note" })]);
    writeNotesCache("user-B", [note({ _id: "b1", title: "B's note" })]);

    expect(readNotesCache("user-A")).toEqual([note({ _id: "a1", title: "A's note" })]);
    expect(readNotesCache("user-B")).toEqual([note({ _id: "b1", title: "B's note" })]);
  });

  it("clearing one user's cache never touches another's", () => {
    writeNotesCache("user-A", [note({ _id: "a1" })]);
    writeNotesCache("user-B", [note({ _id: "b1" })]);

    clearNotesCache("user-A");

    expect(readNotesCache("user-A")).toBeNull();
    expect(readNotesCache("user-B")).toEqual([note({ _id: "b1" })]);
  });

  it("treats corrupt JSON as no cache rather than throwing", () => {
    localStorage.setItem("cloudbook:notes:user-A", "{not json");
    expect(readNotesCache("user-A")).toBeNull();
  });
});
