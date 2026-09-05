import { describe, expect, it } from "vitest";
import type { Note } from "@shared/types";
import { deriveTags, queryNotes } from "./notesQuery";

const n = (over: Partial<Note>): Note => ({
  _id: Math.random().toString(36).slice(2),
  user: "u1",
  title: "t",
  description: "d",
  tag: "General",
  date: "2024-01-01T00:00:00Z",
  ...over,
});

const notes: Note[] = [
  n({ _id: "a", title: "Grocery list", description: "milk, eggs", tag: "Home", date: "2024-03-01" }),
  n({ _id: "b", title: "Standup notes", description: "sprint planning", tag: "Work", date: "2024-03-05" }),
  n({ _id: "c", title: "Book ideas", description: "milk of amnesia", tag: "work", date: "2024-02-10" }),
];

describe("deriveTags", () => {
  it("returns unique tags, case-insensitively de-duped, sorted", () => {
    expect(deriveTags(notes)).toEqual(["Home", "Work"]);
  });
  it("ignores empty tags", () => {
    expect(deriveTags([n({ tag: "" }), n({ tag: "  " }), n({ tag: "X" })])).toEqual(["X"]);
  });
});

describe("queryNotes — search", () => {
  it("matches title or description, case-insensitively", () => {
    const r = queryNotes(notes, { search: "milk", tag: "all", sort: "newest" });
    expect(r.map((x) => x._id).sort()).toEqual(["a", "c"]);
  });
  it("returns nothing for a non-match", () => {
    expect(queryNotes(notes, { search: "zzz", tag: "all", sort: "newest" })).toEqual([]);
  });
});

describe("queryNotes — tag filter", () => {
  it("filters by tag, case-insensitively", () => {
    const r = queryNotes(notes, { search: "", tag: "Work", sort: "newest" });
    expect(r.map((x) => x._id).sort()).toEqual(["b", "c"]);
  });
  it("'all' applies no tag filter", () => {
    expect(queryNotes(notes, { search: "", tag: "all", sort: "newest" })).toHaveLength(3);
  });
});

describe("queryNotes — sort", () => {
  it("newest first by date", () => {
    expect(queryNotes(notes, { search: "", tag: "all", sort: "newest" }).map((x) => x._id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });
  it("oldest first by date", () => {
    expect(queryNotes(notes, { search: "", tag: "all", sort: "oldest" }).map((x) => x._id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });
  it("title A–Z", () => {
    expect(queryNotes(notes, { search: "", tag: "all", sort: "title" }).map((x) => x._id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });
});

describe("queryNotes — combined", () => {
  it("search + tag + sort together", () => {
    const r = queryNotes(notes, { search: "milk", tag: "work", sort: "title" });
    expect(r.map((x) => x._id)).toEqual(["c"]);
  });
});
