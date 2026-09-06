import { type Ref } from "react";
import { m, LayoutGroup } from "framer-motion";
import { Field, Icon } from "@/components/ui";
import { cn } from "@/utils/cn";
import { useMagnetic } from "@/hooks/useMagnetic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { type SortKey } from "@/lib/notesQuery";
import { SortMenu } from "./SortMenu";
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
        <m.label className="note-toolbar__search" layout="position">
          <Icon name="search" size={15} className="note-toolbar__search-icon" />
          <Field
            label="Search notes"
            hideLabel
            type="search"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </m.label>

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

        <SortMenu value={sort} onChange={onSort} />
      </div>
    </LayoutGroup>
  );
}
