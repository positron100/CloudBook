/**
 * The predefined CloudBook tags. Small and intentional — a note's tag is
 * metadata that lives on the paper, not a folder system.
 *
 * These are display strings. The API `tag` field is a free string, so a note
 * whose tag matches one of these (case-insensitively) is shown as that
 * predefined option; anything else is treated as a custom tag and displayed
 * verbatim. Nothing here migrates existing data.
 */
export const PRESET_TAGS = [
  "General",
  "Work",
  "Personal",
  "Ideas",
  "Learning",
  "Projects",
  "Tasks",
  "Important",
] as const;

/** What an empty selection becomes on save — unchanged from before. */
export const DEFAULT_TAG = "General";

/** The canonical preset that `raw` refers to, or undefined if it is custom. */
export function matchPreset(raw: string | undefined | null): string | undefined {
  const t = raw?.trim().toLowerCase();
  if (!t) return undefined;
  return PRESET_TAGS.find((p) => p.toLowerCase() === t);
}

/** True when `raw` is (case-insensitively) one of the predefined tags. */
export const isPreset = (raw: string | undefined | null): boolean => matchPreset(raw) !== undefined;
