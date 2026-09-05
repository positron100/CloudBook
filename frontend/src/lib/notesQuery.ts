import type { Note } from "@shared/types";

export type SortKey = "newest" | "oldest" | "title";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A–Z" },
];

/** Unique tags present in the collection, sorted, case-insensitively de-duped. */
export function deriveTags(notes: Note[]): string[] {
  const seen = new Map<string, string>();
  for (const n of notes) {
    const t = n.tag?.trim();
    if (t && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

interface QueryOptions {
  search: string;
  /** A tag value, or "" / "all" for no tag filter. */
  tag: string;
  sort: SortKey;
}

/**
 * Client-side search + tag filter + sort. Pure — the workspace derives the
 * visible list from this. Server order is only used as the tiebreaker for
 * equal dates.
 */
export function queryNotes(notes: Note[], { search, tag, sort }: QueryOptions): Note[] {
  const q = search.trim().toLowerCase();
  const tagFilter = tag && tag !== "all" ? tag.toLowerCase() : null;

  const filtered = notes.filter((n) => {
    if (tagFilter && n.tag?.toLowerCase() !== tagFilter) return false;
    if (!q) return true;
    return (
      n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)
    );
  });

  const withIndex = filtered.map((note, i) => ({ note, i }));
  withIndex.sort((a, b) => {
    switch (sort) {
      case "title":
        return a.note.title.localeCompare(b.note.title) || a.i - b.i;
      case "oldest":
        return dateOf(a.note) - dateOf(b.note) || a.i - b.i;
      case "newest":
      default:
        return dateOf(b.note) - dateOf(a.note) || a.i - b.i;
    }
  });

  return withIndex.map((x) => x.note);
}

function dateOf(n: Note): number {
  const t = n.date ? new Date(n.date).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}
