import { flushSync } from "react-dom";
import { reveal } from "@/utils/motion";

/**
 * The circular theme reveal — a clip-path circle grows from the toggle to
 * uncover the new theme. Progressive enhancement over the View Transitions
 * API: when the API is missing, or the user prefers reduced motion, the
 * caller applies the theme instantly instead (see ThemeContext).
 *
 * Adapted from the portfolio's startThemeReveal, trimmed to what CloudBook
 * needs. The choreography (clip-path start states, z-index ordering, the
 * `[data-theme-transition] *` transition guard) lives in styles/global.css.
 */

export interface RevealOrigin {
  x: number;
  y: number;
}

/** Minimal shape we use — avoids depending on the (still-shifting) global
 * `ViewTransition` lib type, whose required members vary by TS version. */
interface ViewTransitionLike {
  finished: Promise<unknown>;
  ready: Promise<unknown>;
  skipTransition: () => void;
}

type StartViewTransition = (cb: () => void) => ViewTransitionLike;

export function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && "startViewTransition" in document;
}

export function prefersReducedMotionNow(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Module-scoped, not per-call: two overlapping gestures (or a drag + a stray
// click) must never each start their own transition — each holds a full-page
// GPU snapshot, and overlapping ones pile up rather than replacing each other.
let activeTransition: ViewTransitionLike | null = null;
let activeAnimation: Animation | null = null;

/**
 * Runs `applyTheme` (which flips the `data-theme` attribute via React state)
 * inside a View Transition, then animates a clip-path circle from `origin`.
 * Falls back to just calling `applyTheme` when the API is unavailable — the
 * caller should not invoke this at all under reduced motion.
 */
export async function startThemeReveal(
  next: "light" | "dark",
  origin: RevealOrigin,
  applyTheme: () => void,
): Promise<void> {
  if (!supportsViewTransitions()) {
    applyTheme();
    return;
  }

  const enteringDark = next === "dark";
  const root = document.documentElement;

  try {
    activeAnimation?.cancel();
    activeTransition?.skipTransition();
  } catch {
    /* already settled */
  }
  activeAnimation = null;
  activeTransition = null;

  root.style.setProperty("--reveal-x", `${origin.x}px`);
  root.style.setProperty("--reveal-y", `${origin.y}px`);
  root.setAttribute("data-theme-transition", enteringDark ? "to-dark" : "to-light");

  const endRadius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  );

  const clearRevealVars = () => {
    root.removeAttribute("data-theme-transition");
    root.style.removeProperty("--reveal-x");
    root.style.removeProperty("--reveal-y");
  };

  // Call as a method so `this` stays bound to `document` (extracting the
  // function first throws "Illegal invocation").
  const doc = document as unknown as { startViewTransition: StartViewTransition };
  let transition: ViewTransitionLike;
  try {
    transition = doc.startViewTransition(() => {
      // Synchronous so the "new" snapshot the browser captures already reflects
      // the destination theme's real colours.
      flushSync(applyTheme);
    });
  } catch {
    // API present but the call failed — apply the theme directly and bail.
    applyTheme();
    clearRevealVars();
    return;
  }
  activeTransition = transition;

  let ownAnimation: Animation | null = null;
  transition.finished.finally(() => {
    // A finished WAAPI animation created with `pseudoElement` re-attaches to
    // the next transition's freshly created pseudo tree — cancel it here.
    ownAnimation?.cancel();
    if (activeAnimation === ownAnimation) activeAnimation = null;
    if (activeTransition !== transition) return;
    clearRevealVars();
    activeTransition = null;
  });

  try {
    await transition.ready;
  } catch {
    // Skipped/aborted — applyTheme already ran via flushSync, so state is correct.
    return;
  }

  const grow = [
    `circle(0px at ${origin.x}px ${origin.y}px)`,
    `circle(${endRadius}px at ${origin.x}px ${origin.y}px)`,
  ];

  const animation = root.animate(
    { clipPath: enteringDark ? grow : [...grow].reverse() },
    {
      duration: reveal.durationMs,
      easing: reveal.easing,
      pseudoElement: enteringDark ? "::view-transition-new(root)" : "::view-transition-old(root)",
      fill: "both",
    },
  );
  activeAnimation = animation;
  ownAnimation = animation;
  animation.finished
    .catch(() => {
      /* cancelled by a newer gesture */
    })
    .finally(() => {
      if (activeAnimation === animation) activeAnimation = null;
    });
}
