/**
 * Shared up/down placement resolver for the glass dropdown panels (TagSelect,
 * TagMenu, SortMenu — same trigger+panel idiom). The bug this fixes: each of
 * those computed `spaceAbove = triggerRect.top` / `spaceBelow = innerHeight -
 * triggerRect.bottom`, treating the raw viewport edges as free space. On a
 * page with a sticky `.topnav` header, the top ~70-80px of "spaceAbove" isn't
 * actually free — a panel that opens upward can land with its first option
 * behind the header. Same idea at the bottom against a fixed `.bottomnav`.
 *
 * This measures the real obstructions (if present in the DOM — desktop has no
 * `.bottomnav`, so that obstruction is just 0) and picks the direction that
 * genuinely fits; if neither does, it still picks the roomier one and returns
 * a `maxHeightPx` clamp so the panel scrolls internally within the visible
 * gap instead of rendering past the obstruction.
 */

export interface PanelFit {
  placement: "up" | "down";
  /** Set only when even the chosen side can't fit the full estimated height —
   *  apply as the panel's `max-height` (with `overflow-y: auto`) so it stays
   *  inside the visible gap instead of clipping behind the header/nav. */
  maxHeightPx: number | null;
}

const MIN_PANEL_PX = 120;

function obstructionBottom(selector: string): number {
  const el = document.querySelector(selector);
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  return rect.height > 0 ? rect.bottom : 0;
}

function obstructionTop(selector: string): number {
  const el = document.querySelector(selector);
  if (!el) return window.innerHeight;
  const rect = el.getBoundingClientRect();
  return rect.height > 0 ? rect.top : window.innerHeight;
}

/**
 * @param triggerRect  The trigger's `getBoundingClientRect()`.
 * @param preferred     Which side to use when both fit.
 * @param estimatedPx   Rough panel height (doesn't need to be exact — see
 *                      each caller's own ROW_PX/PANEL_ESTIMATE_PX comment).
 * @param gapPx         The gap the panel's own CSS leaves off the trigger.
 */
export function resolvePanelFit(
  triggerRect: Pick<DOMRect, "top" | "bottom">,
  preferred: "up" | "down",
  estimatedPx: number,
  gapPx: number,
): PanelFit {
  const topObstruction = obstructionBottom(".topnav");
  const bottomObstruction = window.innerHeight - obstructionTop(".bottomnav");

  const spaceAbove = triggerRect.top - topObstruction - gapPx;
  const spaceBelow = window.innerHeight - bottomObstruction - triggerRect.bottom - gapPx;
  const need = estimatedPx;

  const fitsUp = spaceAbove >= need;
  const fitsDown = spaceBelow >= need;

  let placement: "up" | "down";
  if (preferred === "up") placement = fitsUp ? "up" : fitsDown ? "down" : spaceAbove >= spaceBelow ? "up" : "down";
  else placement = fitsDown ? "down" : fitsUp ? "up" : spaceBelow >= spaceAbove ? "down" : "up";

  const available = placement === "up" ? spaceAbove : spaceBelow;
  const maxHeightPx = available < need ? Math.max(MIN_PANEL_PX, available) : null;

  return { placement, maxHeightPx };
}
