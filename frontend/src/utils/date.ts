/** "just now" / "3h ago" / "2d ago" / "Mar 4" / "Mar 4, 2023" */
export function formatRelativeDate(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const now = Date.now();
  const diffMs = now - then.getTime();
  const sec = Math.round(diffMs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  if (sec < 45) return "just now";
  if (min < 45) return `${min}m ago`;
  if (hr < 22) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;

  const sameYear = then.getFullYear() === new Date().getFullYear();
  return then.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}
