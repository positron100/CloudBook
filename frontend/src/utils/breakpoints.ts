/**
 * CloudBook breakpoints. Mirrors the --bp-* tokens in styles/tokens.css.
 *
 * Design targets (every one gets an explicit Playwright pass): 360, 390, 430,
 * 768, 864, 1024, 1280, 1440, 1600, 1920.
 *
 * Named ranges the layout actually branches on:
 *   xs   360–429   1-col notes, bottom nav, no Canvas
 *   sm   430–767   2-col notes, static/simplified 3D
 *   md   768–1023  3-col notes, top nav, light 3D
 *   lg   1024–1279 3-col, richer 3D
 *   xl   1280–1599 4-col, full desktop spatial experience
 *   2xl  1600+     4-col, wider gutters
 */
export const bp = {
  xs: 360,
  sm: 430,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1600,
} as const;

export type BreakpointName = keyof typeof bp;

/** `min-width` media query string for a named breakpoint. */
export const up = (name: BreakpointName): string => `(min-width: ${bp[name]}px)`;

/** `max-width` media query string (one px below the named breakpoint). */
export const down = (name: BreakpointName): string => `(max-width: ${bp[name] - 1}px)`;

/** Between two named breakpoints, inclusive of the lower. */
export const between = (a: BreakpointName, b: BreakpointName): string =>
  `(min-width: ${bp[a]}px) and (max-width: ${bp[b] - 1}px)`;

/** Coarse pointer (touch) — gate hover/parallax affordances on this. */
export const coarsePointer = "(pointer: coarse)";
export const finePointer = "(pointer: fine)";
