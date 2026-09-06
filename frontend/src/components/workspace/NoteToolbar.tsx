import { Field, Icon, SegmentedControl, Select } from "@/components/ui";
import { cn } from "@/utils/cn";
import { SORT_OPTIONS, type SortKey } from "@/lib/notesQuery";
import "./NoteToolbar.css";

export type ViewMode = "grid" | "list";

interface NoteToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  sort: SortKey;
  onSort: (value: SortKey) => void;
  tags: string[];
  activeTag: string;
  onTag: (value: string) => void;
  view: ViewMode;
  onView: (value: ViewMode) => void;
}

/** One glass control group: search · tag filters · sort · view, with hairline
 *  separators. Wraps to rows on narrow screens. */
export function NoteToolbar({
  search,
  onSearch,
  sort,
  onSort,
  tags,
  activeTag,
  onTag,
  view,
  onView,
}: NoteToolbarProps) {
  const filters = ["all", ...tags];

  return (
    <div className="note-toolbar" role="search">
      <div className="note-toolbar__bar">
        <div className="note-toolbar__search">
          <Icon name="search" size={16} className="note-toolbar__search-icon" />
          <Field
            label="Search notes"
            hideLabel
            type="search"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        {tags.length > 0 && (
          <>
            <span className="note-toolbar__sep" aria-hidden="true" />
            <div className="note-toolbar__tags" role="group" aria-label="Filter by tag">
              {filters.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={cn("note-toolbar__tag", activeTag === name && "is-active")}
                  aria-pressed={activeTag === name}
                  onClick={() => onTag(name)}
                >
                  {name === "all" ? "All" : name}
                </button>
              ))}
            </div>
          </>
        )}

        <span className="note-toolbar__sep note-toolbar__sep--end" aria-hidden="true" />

        <Select
          label="Sort"
          hideLabel
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          options={SORT_OPTIONS}
        />

        <SegmentedControl<ViewMode>
          label="Layout"
          value={view}
          onChange={onView}
          segments={[
            { value: "grid", label: "Grid", icon: "grid" },
            { value: "list", label: "List", icon: "list" },
          ]}
        />
      </div>
    </div>
  );
}
