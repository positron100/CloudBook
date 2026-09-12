import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { useRouteTransition, type DragTurn } from "@/components/transitions/RouteTransition";

/** Movement below this stays a click. */
const DRAG_THRESHOLD_PX = 6;
/** How much closer a neighbouring item must be before it takes the drag from
 * the one currently held — a dead zone on the boundary, so a pointer resting
 * there cannot oscillate between two targets. */
const TARGET_HYSTERESIS_PX = 14;
/** Travel for a full turn is the distance between the two item centres, but
 * never less than this — adjacent items sit close, and a full page turn over
 * ~60 px would twitch. */
const MIN_RANGE_PX = 110;
const COMMIT_PROGRESS = 0.45;
const FLICK_VELOCITY_PX_MS = 0.5;
/** Time constant (ms) for the per-frame chase toward the raw pointer
 * position — small enough to read as direct manipulation, large enough to
 * bridge the gaps between pointer samples so the leaf never advances in
 * visible steps. */
const CHASE_TAU_MS = 40;
const CLICK_SUPPRESS_MS = 300;

interface Item {
  path: string;
  left: number;
  width: number;
  centre: number;
}

export interface DragTurnOptions {
  /** The nav list the items live in — pointer positions are read in its space. */
  listRef: RefObject<HTMLElement | null>;
  /** Nav item paths in display order. */
  paths: string[];
  /** The element for a path (a ref record, read at gesture start). */
  getItem: (path: string) => HTMLElement | null;
  /** The section in view — the gesture's origin. */
  current: string;
}

export interface DragTurnHandlers {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
}

/**
 * Drag across the navigation to turn the page by hand.
 *
 * Two interaction models joined: the pointer picks the TARGET the way the
 * portfolio navbar does (threshold-gated horizontal drag, cached geometry,
 * nearest item centre with hysteresis, click suppression), and the page turn
 * is SCRUBBED the way that project's intro arrow is (raw progress in a ref,
 * per-frame exponential chase, velocity from a short sample window, commit on
 * threshold or flick). The turn itself is the app's existing page-turn — the
 * hook only feeds it a progress.
 */
export function useDragTurn({ listRef, paths, getItem, current }: DragTurnOptions) {
  const { dragTurn, transitionTo } = useRouteTransition();
  const [dragging, setDragging] = useState(false);
  const [targetPath, setTargetPath] = useState<string | null>(null);
  /** The indicator's free position while dragging — published by the frame
   *  loop below so the pill follows the pointer without a poll of its own. */
  const [indicator, setIndicator] = useState<{ x: number; width: number } | null>(null);

  // gesture state in refs — nothing here re-renders per pointermove
  const draggingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  /** Pointer x in list space at the moment the drag was confirmed — the
   *  travel origin when the section in view is not itself a nav item
   *  (`/login`, `/register`). */
  const startLocalRef = useRef(0);
  const pointerXRef = useRef(0);
  const itemsRef = useRef<Item[]>([]);
  const originRef = useRef(current);
  const heldRef = useRef<string | null>(null);
  const ctrlRef = useRef<DragTurn | null>(null);
  const rawRef = useRef(0);
  const smoothRef = useRef(0);
  const loopRef = useRef(0);
  const samplesRef = useRef<{ x: number; t: number }[]>([]);
  const suppressClickRef = useRef(false);

  const localX = () => {
    const list = listRef.current;
    return list ? pointerXRef.current - list.getBoundingClientRect().left : pointerXRef.current;
  };

  const cacheGeometry = () => {
    const list = listRef.current;
    if (!list) return;
    const base = list.getBoundingClientRect().left;
    itemsRef.current = paths.flatMap((path) => {
      const el = getItem(path);
      if (!el) return [];
      const r = el.getBoundingClientRect();
      const left = r.left - base;
      return [{ path, left, width: r.width, centre: left + r.width / 2 }];
    });
  };

  const item = (path: string | null) => itemsRef.current.find((i) => i.path === path);

  /** Nearest centre, but a candidate must be clearly closer than the item
   *  already held before it takes over. */
  const resolveTarget = (x: number) => {
    const items = itemsRef.current;
    if (!items.length) return null;
    let best = items[0];
    for (const i of items) if (Math.abs(i.centre - x) < Math.abs(best.centre - x)) best = i;
    const held = item(heldRef.current);
    const resolved =
      !held || held.path === best.path
        ? best
        : Math.abs(held.centre - x) - Math.abs(best.centre - x) > TARGET_HYSTERESIS_PX
          ? best
          : held;

    // Never let the target jump across the origin in one step (e.g. Profile ->
    // Home while sitting on About). That would force the page fold to reverse
    // direction mid-air. Land on the origin first so the next fold begins flat.
    const oi = items.findIndex((i) => i.path === originRef.current);
    const hi = items.findIndex((i) => i.path === (heldRef.current ?? originRef.current));
    const ri = items.findIndex((i) => i.path === resolved.path);
    if (oi >= 0 && hi >= 0 && ri >= 0 && (hi - oi) * (ri - oi) < 0) return items[oi];

    return resolved;
  };

  /** Raw progress: travel from the origin toward the held target's centre,
   *  over that distance (never less than MIN_RANGE_PX). The origin is the
   *  origin item's centre when the section in view is a nav item, otherwise
   *  the point the drag started from. */
  const rawProgress = () => {
    const held = item(heldRef.current);
    if (!held || held.path === originRef.current) return 0;
    const originX = item(originRef.current)?.centre ?? startLocalRef.current;
    const sign = held.centre > originX ? 1 : -1;
    const travel = (localX() - originX) * sign;
    const range = Math.max(Math.abs(held.centre - originX), MIN_RANGE_PX);
    return Math.min(1, Math.max(0, travel / range));
  };

  /** The indicator's free position: pointer-tracked, clamped to the list, at
   *  the held item's width. */
  const overrideGeo = () => {
    const items = itemsRef.current;
    const held = item(heldRef.current) ?? items[0];
    if (!held || !items.length) return null;
    const first = items[0];
    const last = items[items.length - 1];
    const x = Math.min(Math.max(localX() - held.width / 2, first.left), last.left + last.width - held.width);
    return { x, width: held.width };
  };

  const stopLoop = () => {
    window.clearInterval(loopRef.current);
    loopRef.current = 0;
  };
  const startLoop = () => {
    stopLoop();
    let last = performance.now();
    loopRef.current = window.setInterval(() => {
      const t = performance.now();
      const dt = t - last;
      last = t;
      const alpha = 1 - Math.exp(-dt / CHASE_TAU_MS);
      let v = smoothRef.current + (rawRef.current - smoothRef.current) * alpha;
      if (Math.abs(rawRef.current - v) < 0.0005) v = rawRef.current;
      smoothRef.current = v;
      ctrlRef.current?.progress(v);
      const g = overrideGeo();
      setIndicator((prev) => (g && prev && prev.x === g.x && prev.width === g.width ? prev : g));
    }, 1000 / 60);
  };

  /** Signed px/ms toward the held target over the recent sample window. */
  const velocity = () => {
    const s = samplesRef.current;
    if (s.length < 2) return 0;
    const dt = s[s.length - 1].t - s[0].t;
    if (dt < 8) return 0;
    const origin = item(originRef.current);
    const held = item(heldRef.current);
    const sign = origin && held && held.centre < origin.centre ? -1 : 1;
    return ((s[s.length - 1].x - s[0].x) / dt) * sign;
  };

  const updateTarget = () => {
    const target = resolveTarget(localX());
    if (target && target.path !== heldRef.current) {
      heldRef.current = target.path;
      setTargetPath(target.path === originRef.current ? null : target.path);
      ctrlRef.current?.setTarget(target.path);
    }
    rawRef.current = rawProgress();
  };

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      draggingRef.current = false;
      startRef.current = { x: e.clientX, y: e.clientY };
      pointerXRef.current = e.clientX;
      samplesRef.current = [{ x: e.clientX, t: performance.now() }];
      cacheGeometry();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paths],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.buttons === 0) return;
      pointerXRef.current = e.clientX;
      samplesRef.current.push({ x: e.clientX, t: performance.now() });
      if (samplesRef.current.length > 6) samplesRef.current.shift();

      if (!draggingRef.current) {
        const dx = e.clientX - startRef.current.x;
        const dy = e.clientY - startRef.current.y;
        if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
        // a mostly vertical gesture belongs to the page, not the nav
        if (Math.abs(dy) > Math.abs(dx)) return;

        draggingRef.current = true;
        setDragging(true);
        originRef.current = current;
        heldRef.current = current;
        startLocalRef.current = localX();
        rawRef.current = 0;
        smoothRef.current = 0;
        // the snapshot is taken now, while the origin is still in view
        ctrlRef.current = dragTurn();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // capture is a nice-to-have; the gesture still tracks without it
        }
        startLoop();
      }
      // crossings are detected on the pointer sample that caused them
      updateTarget();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, dragTurn],
  );

  const end = useCallback(
    (e: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // already released or never captured
      }
      if (!draggingRef.current) return; // a plain click — onClick owns it
      draggingRef.current = false;
      setDragging(false);
      setIndicator(null);
      stopLoop();
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, CLICK_SUPPRESS_MS);

      const held = heldRef.current;
      const v = velocity();
      const p = rawRef.current;
      const commit =
        cancelled || !held || held === originRef.current
          ? false
          : v > FLICK_VELOCITY_PX_MS
            ? true
            : v < -FLICK_VELOCITY_PX_MS
              ? false
              : p >= COMMIT_PROGRESS;

      const ctrl = ctrlRef.current;
      ctrlRef.current = null;
      if (ctrl) ctrl.release(commit);
      else if (commit && held) transitionTo(held); // reduced motion: plain navigation
      heldRef.current = null;
      setTargetPath(null);
    },
    // velocity/item read refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transitionTo],
  );

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => end(e, false), [end]);
  const onPointerCancel = useCallback((e: ReactPointerEvent<HTMLElement>) => end(e, true), [end]);

  /** Wrap a nav item's click so the release of a drag cannot also fire it. */
  const guardClick = (fn: () => void) => () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    fn();
  };

  const handlers: DragTurnHandlers = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
  return { handlers, dragging, targetPath, guardClick, indicator };
}
