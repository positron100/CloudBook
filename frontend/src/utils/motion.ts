import type { Transition, Variants } from "framer-motion";

/**
 * CloudBook motion vocabulary — the single source of timing/easing/variants.
 *
 * Components import from here. They do NOT define ad-hoc transitions inline.
 * Mirrors the motion tokens in styles/tokens.css so CSS and JS share one rhythm.
 */

/** Durations in seconds (Framer's unit). CSS tokens are the same values in ms. */
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

/** Spring configs for state / layout transitions. */
export const spring = {
  snappy: { type: "spring", stiffness: 500, damping: 32 } satisfies Transition,
  soft: { type: "spring", stiffness: 260, damping: 28 } satisfies Transition,
  indicator: { type: "spring", stiffness: 380, damping: 34 } satisfies Transition,
} as const;

/** The circular theme reveal (Web Animations API — its own ms units). */
export const reveal = {
  durationMs: 700,
  easing: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

/**
 * Interaction budget. IDLE almost still · HOVER subtle · POINTER restrained
 * parallax · DRAG 1:1 + spring return · TRANSITION stronger spatial move.
 */
export const budget = {
  cardTiltDeg: 4,
  sceneParallaxDeg: 6,
  idleFloatPx: 3,
  /** Longest frame delta the smoothing acts on, ms (~4 frames @ 60fps). */
  maxFrameMs: 64,
  /** Magnetic pull, peak px offset at the element edge. */
  magneticStrengthPx: 14,
} as const;

// ---------------------------------------------------------------------------
// Variants — the reusable set. Consumed by components/motion/* primitives.
// ---------------------------------------------------------------------------

/** Fade + short rise. The default entrance for a block of content. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.section, ease: ease.standard },
  },
};

/** Fade only — for content that should not move (avoids layout wobble). */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.base, ease: ease.standard } },
};

/** Directional slide — for view / route transitions. */
export const slide = (dir: "left" | "right" | "up" | "down", distance = 24): Variants => {
  const horizontal = dir === "left" || dir === "right";
  const sign = dir === "left" || dir === "up" ? 1 : -1;
  const off = (d: number) => (horizontal ? { x: d } : { y: d });
  return {
    hidden: { opacity: 0, ...off(sign * distance) },
    visible: {
      opacity: 1,
      ...off(0),
      transition: { duration: duration.base, ease: ease.entrance },
    },
    exit: {
      opacity: 0,
      ...off(sign * -distance),
      // Exit ~65% of enter, per the motion system.
      transition: { duration: duration.fast, ease: ease.exit },
    },
  };
};

export const staggerContainer = (stagger = 0.06, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren } },
});

/** Reveal child — pairs with staggerContainer. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.standard } },
};

/** Small, reason-driven reactions — never decorative constant motion. */
export const jiggle = {
  settle: {
    x: [0, -1.5, 1.5, 0],
    transition: { duration: 0.28, ease: "easeInOut" },
  },
  shake: {
    x: [0, -6, 6, -4, 4, 0],
    transition: { duration: 0.4, ease: "easeInOut" },
  },
} as const;

/** Press-and-settle for buttons: compress on tap, gentle overshoot back. */
export const press = {
  whileTap: { scale: 0.96 },
  transition: { type: "spring", stiffness: 500, damping: 15 },
} as const satisfies { whileTap: object; transition: Transition };

/** Barely-there hover lift for inline controls. */
export const hoverLift = { y: -2 } as const;

/**
 * Delta-based exponential smoothing factor: `1 - exp(-dt/tau)`. Covers the
 * same ground per millisecond regardless of frame rate. dt is clamped to
 * budget.maxFrameMs so one long frame never teleports.
 */
export function smoothingAlpha(deltaMs: number, tauMs: number): number {
  return 1 - Math.exp(-Math.min(deltaMs, budget.maxFrameMs) / tauMs);
}

/**
 * Shared-layout id conventions (framer `layoutId`). Established here so the
 * card→editor signature transition in P1.10 has stable names.
 */
export const layoutId = {
  note: (id: string) => `note-${id}`,
  noteTitle: (id: string) => `note-title-${id}`,
  navIndicator: "nav-indicator",
} as const;
