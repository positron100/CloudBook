import "./WorkspaceHeader.css";

interface WorkspaceHeaderProps {
  /** Total notes in the collection (before filtering). */
  total: number;
  /** Notes currently shown (after filtering). */
  shown: number;
  filtered: boolean;
}

export function WorkspaceHeader({ total, shown, filtered }: WorkspaceHeaderProps) {
  return (
    <header className="ws-header">
      <h1 className="ws-header__title">Your desk</h1>
      <p className="ws-header__sub">
        {total === 0
          ? "A calm place to collect your thoughts."
          : filtered
            ? `${shown} of ${total} ${total === 1 ? "note" : "notes"}`
            : `${total} ${total === 1 ? "note" : "notes"} on the cloud`}
      </p>
    </header>
  );
}
