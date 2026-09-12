import { m } from "framer-motion";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { cn } from "@/utils/cn";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { spring } from "@/utils/motion";
import "./NavIndicator.css";

interface Geo {
  x: number;
  width: number;
}

interface NavIndicatorProps {
  /** The nav list element containing the links. */
  containerRef: RefObject<HTMLElement | null>;
  /** Re-measure when this changes (e.g. the current pathname, or hovered key). */
  activeKey: string;
  /** Which descendant to sit behind. Defaults to the active link. */
  targetSelector?: string;
  /** Extra class — e.g. "nav-indicator--halo" for the fainter hover marker. */
  className?: string;
  /** Stay mounted and cross-fade opacity instead of unmounting when there is
   * no target. Used by the hover halo so it reads as light passing over the
   * glass rather than popping in. */
  fade?: boolean;
  /** A live position from the drag-to-turn gesture. While non-null the pill
   * sits here (no spring — it is tracking the pointer); when it clears, the
   * pill springs from wherever it was onto the measured target. */
  override?: Geo | null;
}

/**
 * A dimensional pill that glides to sit behind a nav item. Measured (not
 * layoutId) so it works with the domAnimation feature set. Hidden until a
 * target exists; instant snap under reduced motion. Two of these run in the
 * nav: the active-destination marker and, fainter and underneath, a hover
 * halo that previews where a click would land.
 */
export function NavIndicator({
  containerRef,
  activeKey,
  targetSelector = "[aria-current='page']",
  className,
  fade = false,
  override = null,
}: NavIndicatorProps) {
  const reduceMotion = useReducedMotion();
  const [rect, setRect] = useState<Geo | null>(null);
  const lastRect = useRef<Geo | null>(null);
  if (rect) lastRect.current = rect;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Items observed for resize so far, beyond `container` itself — see why
    // below. Re-observing an already-observed element is a defined no-op, so
    // this only needs to grow, never reconcile.
    const observedSlots = new Set<Element>();
    let ro: ResizeObserver | null = null;

    const measure = () => {
      const target = container.querySelector<HTMLElement>(targetSelector);
      if (!target) {
        setRect(null);
        return;
      }
      // Measure the item's slot (the direct child of the list) — its offset
      // geometry, not `getBoundingClientRect()`. A newly-added nav item (e.g.
      // Home, bubbling in right after login) mounts with a framer entrance
      // transform (`scale: 0.55 -> 1`) on this exact element, and this effect
      // runs via useLayoutEffect — synchronously after the DOM commit but
      // before that animation has ticked forward from its initial value. A
      // rect read then would capture the box at 55% scale. `offsetWidth` /
      // `offsetLeft` are pure layout-box metrics: transform never touches
      // them, so the very first measurement is correct regardless of where
      // the entrance animation happens to be.
      let slot: HTMLElement = target;
      while (slot.parentElement && slot.parentElement !== container) {
        slot = slot.parentElement;
      }
      // The nav items share the list's width equally (flex: 1 each). Two
      // things change a slot's *own* rendered width without ever changing
      // the *container's* box, so watching only `container` misses them:
      // (1) a sibling item mid-exit (AnimatePresence keeps it mounted through
      // its own spring) still claims a share of the flex row until it
      // actually unmounts, after which the remaining items — this one
      // included — widen to fill the space; (2) this item's text reflowing
      // once the self-hosted Poppins weight it needs finishes loading (it
      // isn't requested until first laid out, which for the *active* item's
      // bold weight can be the moment it becomes current). Observing the
      // slot itself catches both — and every other such case — generically.
      if (ro && !observedSlots.has(slot)) {
        observedSlots.add(slot);
        ro.observe(slot);
      }
      // offsetLeft is already relative to the (unscrolled) content flow — the
      // indicator is positioned absolute *inside* this same scrolling box, so
      // no separate scrollLeft correction is needed (unlike a viewport rect).
      let left = 0;
      for (let el: HTMLElement | null = slot; el && el !== container; el = el.offsetParent as HTMLElement | null) {
        left += el.offsetLeft;
      }
      setRect({ x: left, width: slot.offsetWidth });
    };

    if (typeof ResizeObserver === "undefined") {
      measure();
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    ro = new ResizeObserver(measure);
    ro.observe(container);
    measure();
    return () => ro?.disconnect();
  }, [containerRef, activeKey, targetSelector]);

  if (!rect && !override && !(fade && lastRect.current)) return null;

  const geo = override || rect || lastRect.current!;

  return (
    <m.div
      className={cn("nav-indicator", className)}
      aria-hidden="true"
      initial={false}
      animate={{ x: geo.x, width: geo.width, opacity: fade ? (rect ? 1 : 0) : 1 }}
      transition={
        reduceMotion || override
          ? { duration: 0 }
          : { ...spring.indicator, opacity: { duration: 0.16, ease: "easeOut" } }
      }
    />
  );
}
