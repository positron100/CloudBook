import type { AlertState } from "@/types/alert";

/**
 * Fixed-height alert slot below the navbar. Renders an empty (invisible) alert
 * box when there is no message so page content doesn't jump when one appears —
 * matching the pre-revamp behavior.
 */
export default function Alert({ alert }: { alert: AlertState }) {
  return (
    <div className="container" style={{ height: "50px" }}>
      <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
        {alert.message}
      </div>
    </div>
  );
}
