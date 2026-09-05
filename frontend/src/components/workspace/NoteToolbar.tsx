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
  return (
    <div className="note-toolbar" role="search">
      <div className="note-toolbar__row">
        <div className="note-toolbar__search">
          <Icon name="search" size={16} className="note-toolbar__search-icon" />
          <Field
            label="Search notes"
            hideLabel
            type="search"
            placeholder="Search your notes…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

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

      {tags.length > 0 && (
        <div className="note-toolbar__tags" role="group" aria-label="Filter by tag">
          <button
            type="button"
            className={cn("note-toolbar__tag", activeTag === "all" && "is-active")}
            aria-pressed={activeTag === "all"}
            onClick={() => onTag("all")}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={cn("note-toolbar__tag", activeTag === tag && "is-active")}
              aria-pressed={activeTag === tag}
              onClick={() => onTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
