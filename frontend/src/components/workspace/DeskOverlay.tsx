import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/**
 * Renders a desk overlay — a sheet in flight, or the editor page — at the
 * document root.
 *
 * These are `position: fixed` and are placed in viewport coordinates measured
 * from the board and the diary. But the workspace lives inside `.route-host`,
 * which carries `perspective` for the section page-turn, and `perspective` —
 * like `transform` and `filter` — makes an element the containing block for
 * its fixed-position descendants. Rendered in place, every overlay was
 * therefore displaced by the route host's origin (~48 × 76 px): the sheet left
 * the notebook, jumped that far, and landed beside the card it was aiming at.
 *
 * Portalling to `<body>` puts them back in real viewport space, so a rect
 * measured off the board is the rect the sheet actually flies to.
 */
export function DeskOverlay({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
