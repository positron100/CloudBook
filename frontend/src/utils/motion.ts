/**
 * CloudBook motion vocabulary — plain data, no animation library.
 *
 * Mirrors the motion tokens in styles/tokens.css so JS-driven motion (and
 * Framer Motion, wired in P1.2) shares one rhythm with CSS. Import these
 * rather than inventing per-component timings.
 */

/** Durations in seconds (Framer's unit). CSS uses ms — keep them in sync. */
export const duration = {
  micro: 0.14,
  fast: 0.24,
  base: 0.4,
  section: 0.6,
  cinematic: 0.9,
} as const;

/** Cubic-bezier control points. No linear / default easing anywhere. */
export const ease = {
  standard: [0.16, 1, 0.3, 1],
  entrance: [0.22, 1, 0.36, 1],
  exit: [0.4, 0, 1, 1],
  press: [0.34, 1.4, 0.64, 1],
} as const;

/** Spring configs for state/layout transitions. */
export const spring = {
  snappy: { type: "spring", stiffness: 500, damping: 32 },
  soft: { type: "spring", stiffness: 260, damping: 28 },
  indicator: { type: "spring", stiffness: 380, damping: 34 },
} as const;

/** The circular theme reveal (Web Animations API — its own ms units). */
export const reveal = {
  durationMs: 700,
  easing: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

/**
 * Interaction budget — how much motion each class of interaction is allowed.
 * IDLE almost still · HOVER subtle · POINTER restrained parallax ·
 * DRAG 1:1 + spring return · TRANSITION stronger spatial move.
 */
export const budget = {
  /** Max tilt for a large card leaning toward the pointer. */
  cardTiltDeg: 4,
  /** Max scene lean for the auth notebook parallax. */
  sceneParallaxDeg: 6,
  /** Idle float amplitude, px. */
  idleFloatPx: 3,
  /** Longest frame delta the smoothing acts on, ms (~4 frames @ 60fps). */
  maxFrameMs: 64,
} as const;

/**
 * Variant-shaped objects — plain data now, consumed by Framer `variants` in
 * P1.2+. Kept here so the shapes are defined before the library is added.
 */
export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.section, ease: ease.standard },
  },
} as const;

export const staggerContainer = (stagger = 0.06, delayChildren = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren } },
});

/** Small, reason-driven reactions — never decorative constant motion. */
export const jiggle = {
  settle: { x: [0, -1.5, 1.5, 0], transition: { duration: 0.28, ease: "easeInOut" } },
  shake: { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.4, ease: "easeInOut" } },
} as const;

/** Press-and-settle for buttons: compress on tap, gentle overshoot back. */
export const press = {
  whileTap: { scale: 0.96 },
  transition: { type: "spring", stiffness: 500, damping: 15 },
} as const;

/** Barely-there hover lift for inline controls. */
export const hoverLift = { y: -2 } as const;

/**
 * Delta-based exponential smoothing factor. `1 - exp(-dt/tau)` — covers the
 * same ground per millisecond regardless of frame rate. Clamp dt to
 * budget.maxFrameMs before calling so one long frame never teleports.
 */
export function smoothingAlpha(deltaMs: number, tauMs: number): number {
  return 1 - Math.exp(-Math.min(deltaMs, budget.maxFrameMs) / tauMs);
}
