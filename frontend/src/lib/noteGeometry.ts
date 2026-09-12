/**
 * Where a note card *will* be — its settled slot on the board.
 *
 * `getBoundingClientRect()` is the wrong tool here. The pile animates with
 * Framer `layout`, and a freshly inserted card still carries its mount offset
 * (`initial={{ y: 20 }}`) until it is revealed, so a rect read during a
 * create/edit/delete gesture is a *transient* pose. Anything that flies to the
 * board using it lands beside the card and the card then snaps into place.
 *
 * Offset geometry (`offsetLeft` / `offsetTop` / `offsetWidth`) is pure layout —
 * transforms do not touch it — so it gives the final resting box the instant
 * the card is in the DOM, however much of the pile is still gliding. The
 * resting pose (`--rot` / `--tx`, applied by NoteStack as CSS `rotate` /
 * `translate`) is read separately so a flying sheet can land on the card's
 * exact tilt instead of squaring up beside it.
 */

export interface SlotPose {
  /** Viewport coordinates of the card's settled, untransformed box. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** The card's resting tilt in the pile, in degrees. */
  rotate: number;
}

const esc = (v: string) =>
  typeof window !== "undefined" && window.CSS?.escape ? window.CSS.escape(v) : v.replace(/"/g, '\\"');

export const noteEl = (id: string): HTMLElement | null =>
  typeof document === "undefined"
    ? null
    : document.querySelector<HTMLElement>(`[data-note-id="${esc(id)}"]`);

/** Degrees from a computed `rotate` ("none" | "-1deg" | "0deg 0deg 1 -1deg"). */
function restingRotate(el: HTMLElement): number {
  const raw = getComputedStyle(el).rotate;
  if (!raw || raw === "none") return 0;
  const deg = raw.trim().split(/\s+/).find((p) => p.endsWith("deg"));
  return deg ? parseFloat(deg) || 0 : 0;
}

/** Px from a computed `translate` ("none" | "-4px 0px"). */
function restingTranslateX(el: HTMLElement): number {
  const raw = getComputedStyle(el).translate;
  if (!raw || raw === "none") return 0;
  return parseFloat(raw) || 0;
}

/**
 * The settled pose of the card for `id`, in viewport coordinates. `undefined`
 * when the card is not mounted or has no box yet.
 */
export function noteSlotPose(id: string): SlotPose | undefined {
  const card = noteEl(id);
  if (!card) return undefined;
  const width = card.offsetWidth;
  const height = card.offsetHeight;
  if (!width || !height) return undefined;

  const rotate = restingRotate(card);
  const stack = card.closest<HTMLElement>(".note-stack");
  if (!stack) {
    // Not in the pile (a preview harness, say) — the live rect is all there is.
    const r = card.getBoundingClientRect();
    return { left: r.left, top: r.top, width, height, rotate };
  }

  // Walk the offsetParent chain up to the pile's positioned root. This is
  // layout-only, so an in-flight `layout` animation on any ancestor slot does
  // not leak into the answer.
  let left = 0;
  let top = 0;
  for (let el: HTMLElement | null = card; el && el !== stack; el = el.offsetParent as HTMLElement | null) {
    left += el.offsetLeft;
    top += el.offsetTop;
  }

  // offsetLeft ignores the scroll of intermediate scrollers; the board scrolls
  // sideways as the pile grows, so put that back.
  const scroller = stack.querySelector<HTMLElement>(".note-stack__scroll");
  const base = stack.getBoundingClientRect();
  return {
    left: base.left + left - (scroller?.scrollLeft ?? 0) + restingTranslateX(card),
    top: base.top + top - (scroller?.scrollTop ?? 0),
    width,
    height,
    rotate,
  };
}

/** A DOMRect view of a pose — for the flight components, which think in rects. */
export const poseRect = (p: SlotPose): DOMRect =>
  new DOMRect(p.left, p.top, p.width, p.height);
