import { createContext, useCallback, useContext, useRef, type ReactNode } from "react";
import { cubicBezier } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { pageTurn } from "@/utils/motion";
import "./RouteTransition.css";

/**
 * A page turn the user is holding: the leaf is scrubbed by a 0–1 progress
 * instead of played, the section it turns toward can change while the
 * pointer is down, and release either finishes the turn or lets it fall back.
 */
export interface DragTurn {
  /** The section being revealed underneath. Navigates provisionally; passing
   *  the origin path again returns the leaf to rest with no target. */
  setTarget: (path: string) => void;
  /** Scrub the leaf: 0 = flat on the book, 1 = fully turned. */
  progress: (p: number) => void;
  /** End the gesture — finish the turn (commit) or fall back to the origin. */
  release: (commit: boolean) => void;
}

interface RouteTransitionValue {
  /**
   * Navigate to `path` by turning the current section over like a book page:
   * the page in view lifts at its leading edge, bends at a crease and swings
   * over the spine, revealing the next section already in place underneath.
   * Forward through the app (Home → About → Profile → Log in → Register) turns
   * the page left over a left-hand spine; backward mirrors it. Instant under
   * reduced motion, and skipped between the two auth modes (that is an
   * internal mode switch, not a page).
   */
  transitionTo: (path: string, state?: unknown) => void;
  /** Begin an interactive turn from the section in view. `null` under reduced
   *  motion (callers fall back to `transitionTo` on release). */
  dragTurn: () => DragTurn | null;
  /** <RouteTransitionStage> hands us its host element. */
  registerHost: (el: HTMLDivElement | null) => void;
}

const RouteTransitionContext = createContext<RouteTransitionValue | null>(null);

function useCtx() {
  const ctx = useContext(RouteTransitionContext);
  if (!ctx) throw new Error("RouteTransition components must be used within <RouteTransitionProvider>");
  return ctx;
}

export function useRouteTransition(): Pick<RouteTransitionValue, "transitionTo" | "dragTurn"> {
  const { transitionTo, dragTurn } = useCtx();
  return { transitionTo, dragTurn };
}

const AUTH_PATHS = new Set(["/login", "/register"]);
const isAuthSwitch = (a: string, b: string) => AUTH_PATHS.has(a) && AUTH_PATHS.has(b);

/** Reading order of the book. Unknown paths count as "further on". */
const PAGE_ORDER: Record<string, number> = { "/": 0, "/about": 1, "/profile": 2, "/login": 3, "/register": 4 };
const pageIndex = (path: string) => PAGE_ORDER[path.replace(/\/+$/, "") || "/"] ?? 99;
type Dir = "forward" | "back";
const dirOf = (from: string, to: string): Dir => (pageIndex(to) >= pageIndex(from) ? "forward" : "back");

/** The signature page turn — deliberately unhurried so it can be watched. A
 *  real leaf of premium paper takes its time; too slow would frustrate, so
 *  ~1s is the sweet spot (the drag gesture can still outrun it). */
const TURN_MS = pageTurn.durationMs;
/** The single eased progress every part of the turn is derived from: a slow
 *  build off the spine, a glide through vertical, then a long soft settle as
 *  the leaf goes edge-on. Gentle at both ends — no snap, no mid-turn kick. */
const lift = cubicBezier(...pageTurn.ease);
/** A smooth 0 → 1 → 0 transient with zero velocity at both ends — the crease
 *  bend and the two shadows all ride this, so nothing switches state mid-turn. */
const arc = (e: number) => Math.sin(Math.PI * e);
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
/** `?introslow` stretches every turn ×6 like the opening, so it can be traced. */
const slowFactor = () => {
  try {
    return new URLSearchParams(window.location.search).has("introslow") ? 6 : 1;
  } catch {
    return 1;
  }
};

interface Turn {
  /** Scrub to an absolute progress. */
  frame: (p: number) => void;
  /** Rebuild the leaf for a new direction from the same snapshot, keeping the
   *  current progress. */
  setDir: (dir: Dir) => void;
  /** Play from the current progress to 0 or 1 — linearly in p, so the leaf
   *  follows exactly the curve it would on a click — then tear down. */
  play: (to: 0 | 1, ms: number, onDone?: () => void) => void;
  /** Tear down immediately, wherever the leaf is. */
  cancel: () => void;
  readonly p: number;
}

/**
 * A turning leaf over the current page. Everything here is plain DOM: the
 * page is `cloneNode`d once into two copies (React state untouched) and the
 * motion is written as inline styles from `frame(p)` — driven by a timer when
 * played, or straight from a gesture when scrubbed. The real next page sits
 * underneath from the moment it is routed in.
 */
function createTurn(host: HTMLDivElement, stage: HTMLElement, initialDir: Dir): Turn {
  const height = stage.offsetHeight;

  const copy = () => {
    const c = stage.cloneNode(true) as HTMLElement;
    c.classList.add("page-turn__copy");
    c.removeAttribute("id");
    c.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    c.querySelectorAll("[data-note-id]").forEach((el) => el.removeAttribute("data-note-id"));
    // cloneNode keeps attributes, not live form values
    const live = stage.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    c.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea").forEach((el, i) => {
      if (live[i]) el.value = live[i].value;
    });
    return c;
  };
  // the snapshot is taken once; a direction change re-hangs these same copies
  const copies = [copy(), copy()];

  let dir = initialDir;
  let s = 0; // -1: spine on the left, leaf swings left (forward). +1: mirrored.
  let sheet: HTMLDivElement, inner: HTMLDivElement, outer: HTMLDivElement, shade: HTMLDivElement, cast: HTMLDivElement;

  const build = () => {
    s = dir === "forward" ? -1 : 1;
    sheet = document.createElement("div");
    sheet.className = "page-turn";
    sheet.dataset.dir = dir;
    sheet.setAttribute("aria-hidden", "true");
    sheet.style.height = `${height}px`;
    inner = document.createElement("div");
    inner.className = "page-turn__panel page-turn__panel--spine";
    outer = document.createElement("div");
    outer.className = "page-turn__panel page-turn__panel--edge";
    shade = document.createElement("div");
    shade.className = "page-turn__shade";
    cast = document.createElement("div");
    cast.className = "page-turn__cast";
    cast.dataset.dir = dir;
    inner.appendChild(copies[0]);
    outer.appendChild(copies[1]);
    inner.appendChild(outer);
    inner.appendChild(shade);
    sheet.appendChild(inner);
    host.appendChild(cast);
    host.appendChild(sheet);
  };
  const unbuild = () => {
    sheet.remove();
    cast.remove();
  };

  build();
  // keep the document as tall as the old page for the turn, so a shorter next
  // page can't clamp the scroll position and jolt the leaf mid-air
  host.style.minHeight = `${height}px`;

  let p = 0;
  const frame = (next: number) => {
    p = next;
    // one eased progress drives everything, so the motion reads as a single
    // continuous fold rather than a sequence of transforms
    const e = lift(p);
    const a = arc(e);
    // the leaf swings over the spine and vanishes edge-on (backface hidden)
    inner.style.transform = `rotateY(${s * 104 * e}deg)`;
    // the leading half curls further at the crease as the sheet lifts, easing
    // flat again as it goes edge-on — one curve, no plateau or reversal. A bit
    // more curl now that the turn is slow enough to see it.
    outer.style.transform = `rotateY(${s * 27 * a}deg)`;
    // crease shade and cast shadow both ride the same 0→1→0 arc — deepen the
    // crease a touch, soften the cast so nothing reads as a hard band.
    shade.style.opacity = String(0.58 * a);
    cast.style.opacity = String(0.82 * a);
    // the next page settles into place beneath it, on the same progress
    stage.style.opacity = String(0.92 + 0.08 * e);
    stage.style.transform = `scale(${0.992 + 0.008 * e})`;
  };

  let done = false;
  let timer = 0;
  const cleanup = () => {
    if (done) return;
    done = true;
    window.clearInterval(timer);
    unbuild();
    host.style.minHeight = "";
    stage.style.opacity = "";
    stage.style.transform = "";
  };

  const turn: Turn = {
    frame: (next) => {
      if (!done) frame(next);
    },
    setDir: (next) => {
      if (done || next === dir) return;
      // Flip in place — no unbuild/build. Removing and re-appending the sheet
      // drops a frame and reads as the fold "skipping"; the spine origin and
      // the half clip-paths are driven by [data-dir] in CSS, so switching the
      // attribute and the sign is enough, then re-apply the current progress.
      dir = next;
      s = dir === "forward" ? -1 : 1;
      sheet.dataset.dir = dir;
      cast.dataset.dir = dir;
      frame(p);
    },
    play: (to, ms, onDone) => {
      if (done) return;
      window.clearInterval(timer);
      const from = p;
      const start = now();
      const tick = () => {
        const t = Math.min(1, (now() - start) / ms);
        frame(from + (to - from) * t);
        if (t >= 1) {
          cleanup();
          onDone?.();
        }
      };
      timer = window.setInterval(tick, 1000 / 60);
      tick();
    },
    cancel: cleanup,
    get p() {
      return p;
    },
  };
  frame(0);
  return turn;
}

export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();
  const host = useRef<HTMLDivElement | null>(null);
  const turn = useRef<Turn | null>(null);
  // the section in view, readable from a gesture without a re-render
  const here = useRef(location.pathname);
  here.current = location.pathname;

  const registerHost = useCallback((el: HTMLDivElement | null) => {
    host.current = el;
  }, []);

  const dropTurn = useCallback(() => {
    turn.current?.cancel();
    turn.current = null;
  }, []);

  const transitionTo = useCallback(
    (path: string, state?: unknown) => {
      const from = here.current;
      if (path === from) return;
      const stage = host.current?.querySelector<HTMLElement>(".route-stage");
      // Auth mode switch (login <-> register), reduced motion, or nothing to
      // turn → plain navigation.
      if (reduce || isAuthSwitch(from, path) || !host.current || !stage) {
        navigate(path, { state });
        return;
      }
      // a new turn cancels one still in the air — its snapshot just vanishes and
      // the page now in view becomes the next leaf
      dropTurn();
      const t = createTurn(host.current, stage, dirOf(from, path));
      turn.current = t;
      navigate(path, { state });
      t.play(1, TURN_MS * slowFactor(), () => {
        if (turn.current === t) turn.current = null;
      });
    },
    [reduce, navigate, dropTurn],
  );

  const dragTurn = useCallback((): DragTurn | null => {
    const stage = host.current?.querySelector<HTMLElement>(".route-stage");
    if (reduce || !host.current || !stage) return null;
    const origin = here.current;
    dropTurn();
    const hostEl = host.current;
    let t: Turn | null = null; // created lazily on the first real target
    let target = origin;
    let pushed = false; // one provisional history entry at most per gesture
    let p = 0;
    let ended = false;

    const go = (path: string) => {
      if (path === here.current) return;
      if (pushed) navigate(path, { replace: true });
      else {
        navigate(path);
        pushed = true;
      }
    };

    const api: DragTurn = {
      setTarget: (path) => {
        if (ended || path === target) return;
        target = path;
        if (path === origin) {
          // Back on the origin item: route back. The leaf is NOT snapped flat
          // here — progress() keeps driving it, and the hook feeds a progress
          // that trends to 0 while the origin is held, so it eases to flat.
          // Snapping it caused a visible jump when the drag crossed the origin.
          if (pushed) {
            navigate(-1);
            pushed = false;
          }
          return;
        }
        if (!isAuthSwitch(origin, path)) {
          if (!t) {
            t = createTurn(hostEl, stage, dirOf(origin, path));
            turn.current = t;
          } else t.setDir(dirOf(origin, path));
          t.frame(p);
        }
        go(path);
      },
      progress: (next) => {
        if (ended) return;
        p = Math.min(1, Math.max(0, next));
        // Always drive the leaf — while the origin is held the hook feeds a
        // progress that trends to 0, so the fold eases back to flat rather than
        // freezing part-open or snapping shut.
        t?.frame(p);
      },
      release: (commit) => {
        if (ended) return;
        ended = true;
        const leaf = t;
        const finish = () => {
          if (turn.current === leaf) turn.current = null;
        };
        if (commit && target !== origin) {
          // finish the turn from wherever it is, on the same curve a click uses
          if (leaf) leaf.play(1, Math.max(180, (1 - p) * TURN_MS) * slowFactor(), finish);
          return;
        }
        // fall back: the origin returns underneath while the leaf settles flat
        if (pushed) navigate(-1);
        if (leaf) leaf.play(0, Math.max(180, p * TURN_MS * 0.8) * slowFactor(), finish);
      },
    };
    return api;
  }, [reduce, navigate, dropTurn]);

  return (
    <RouteTransitionContext.Provider value={{ transitionTo, dragTurn, registerHost }}>
      {children}
    </RouteTransitionContext.Provider>
  );
}

/**
 * Wraps the routed page content. The host provides the perspective and is
 * where a turning leaf is laid over the page; the stage is the page itself.
 * The nav and the desk backdrop sit outside and never move.
 */
export function RouteTransitionStage({ children }: { children: ReactNode }) {
  const { registerHost } = useCtx();
  return (
    <div className="route-host" ref={registerHost}>
      <div className="route-stage">{children}</div>
    </div>
  );
}
