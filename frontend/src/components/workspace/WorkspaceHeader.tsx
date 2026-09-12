import { Skeleton } from "@/components/ui";
import "./WorkspaceHeader.css";

interface WorkspaceHeaderProps {
  /** Total notes in the collection (before filtering). */
  total: number;
  /** Notes currently shown (after filtering). */
  shown: number;
  filtered: boolean;
  /** First load, nothing cached — show a placeholder for the count line. */
  loading?: boolean;
  /** A background refresh is in flight while notes already show on screen. */
  syncing?: boolean;
  /** The last refresh failed but the notes on screen are still the last
   *  known-good copy — say so quietly rather than pretending it succeeded. */
  stale?: boolean;
}

export function WorkspaceHeader({ total, shown, filtered, loading, syncing, stale }: WorkspaceHeaderProps) {
  return (
    <header className="ws-header">
      <h1 className="ws-header__title">Your desk</h1>
      {loading ? (
        <Skeleton className="ws-header__sub-skeleton" height="0.8rem" width="8.5rem" />
      ) : (
        <p className="ws-header__sub">
          {total === 0
            ? "A calm place to collect your thoughts."
            : filtered
              ? `${shown} of ${total} ${total === 1 ? "note" : "notes"}`
              : `${total} ${total === 1 ? "note" : "notes"} on the cloud`}
          {syncing && <span className="ws-header__sync"> · syncing</span>}
          {stale && !syncing && <span className="ws-header__sync" data-warn>{" "}· showing saved notes</span>}
        </p>
      )}
    </header>
  );
}
