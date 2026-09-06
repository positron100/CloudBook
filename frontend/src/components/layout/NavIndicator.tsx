import { m } from "framer-motion";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { cn } from "@/utils/cn";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { spring } from "@/utils/motion";
import "./NavIndicator.css";

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
}: NavIndicatorProps) {
  const reduceMotion = useReducedMotion();
  const [rect, setRect] = useState<{ x: number; width: number } | null>(null);
  const lastRect = useRef<{ x: number; width: number } | null>(null);
  if (rect) lastRect.current = rect;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const target = container.querySelector<HTMLElement>(targetSelector);
      if (!target) {
        setRect(null);
        return;
      }
      setRect({ x: target.offsetLeft, width: target.offsetWidth });
    };

    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, activeKey, targetSelector]);

  if (!rect && !(fade && lastRect.current)) return null;

  const geo = rect ?? lastRect.current!;

  return (
    <m.div
      className={cn("nav-indicator", className)}
      aria-hidden="true"
      initial={false}
      animate={{ x: geo.x, width: geo.width, opacity: fade ? (rect ? 1 : 0) : 1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { ...spring.indicator, opacity: { duration: 0.16, ease: "easeOut" } }
      }
    />
  );
}
