import { type Ref } from "react";
import { m, LayoutGroup } from "framer-motion";
import { Field } from "@/components/ui";
import { cn } from "@/utils/cn";
import { useMagnetic } from "@/hooks/useMagnetic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { type SortKey } from "@/lib/notesQuery";
import { SortMenu } from "./SortMenu";
import { TagMenu } from "./TagMenu";
import { SearchPill } from "./SearchPill";
import "./NoteToolbar.css";

interface NoteToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  sort: SortKey;
  onSort: (value: SortKey) => void;
  tags: string[];
  activeTag: string;
  onTag: (value: string) => void;
}

/** A magnetic tag chip — a small physical object that leans toward the cursor
 *  on fine pointers, springs back on leave, inert on touch / reduced motion. */
function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const reduce = useReducedMotion();
  const magnetic = useMagnetic({ strength: 4 });
  return (
    <m.button
      ref={magnetic.ref as Ref<HTMLButtonElement>}
      type="button"
      className={cn("note-toolbar__tag", active && "is-active")}
      aria-pressed={active}
      onClick={onClick}
      onMouseMove={magnetic.onMouseMove}
      onMouseLeave={magnetic.onMouseLeave}
      style={magnetic.style}
      whileHover={reduce ? undefined : { y: -2 }}
      whileTap={reduce ? undefined : { scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
    >
      {label}
    </m.button>
  );
}

/** Search · tag filters · sort, sitting in the desk header — not a boxed
 *  dashboard toolbar. The note pile stays the hero. */
export function NoteToolbar({
  search,
  onSearch,
  sort,
  onSort,
  tags,
  activeTag,
  onTag,
}: NoteToolbarProps) {
  const filters = ["all", ...tags];

  return (
    <LayoutGroup>
      <div className="note-toolbar" role="search">
        {/* `lift` carries the whole affordance: a small pointer magnetism, a
            focus Z-lift instead of a blue ring, and the leading icon rides
            inside the control so it never drifts out of line with the text.
            Desktop only — mobile uses the collapsible icon row below. */}
        <div className="note-toolbar__search">
          <Field
            label="Search notes"
            hideLabel
            lift
            iconStart="search"
            type="search"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        {tags.length > 0 && (
          <m.div
            className="note-toolbar__tags"
            role="group"
            aria-label="Filter by tag"
            layout="position"
          >
            {filters.map((name) => (
              <TagChip
                key={name}
                label={name === "all" ? "All" : name}
                active={activeTag === name}
                onClick={() => onTag(name)}
              />
            ))}
          </m.div>
        )}

        <div className="note-toolbar__sort">
          <SortMenu value={sort} onChange={onSort} />
        </div>

        {/* Mobile — Search lives in its own flexible slot (grows into
            whatever room is left); Tag and Sort sit in a plain, un-animated
            fixed-width group after it. Two flex children, one flexible + one
            fixed — Tag/Sort's own X is then pure CSS arithmetic (container
            width minus their own constant width), never touched by React or
            framer, so they can't drift/jitter as Search's width changes,
            only Search itself moves. See NoteToolbar.css. */}
        <div className="note-toolbar__compact">
          <div className="note-toolbar__compact-search-slot">
            <SearchPill value={search} onChange={onSearch} />
          </div>

          <div className="note-toolbar__compact-actions">
            {tags.length > 0 && <TagMenu tags={tags} activeTag={activeTag} onTag={onTag} />}
            <SortMenu value={sort} onChange={onSort} />
          </div>
        </div>
      </div>
    </LayoutGroup>
  );
}
