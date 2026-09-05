import { m } from "framer-motion";
import { useLayoutEffect, useState, type RefObject } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { spring } from "@/utils/motion";
import "./NavIndicator.css";

interface NavIndicatorProps {
  /** The nav list element containing the links. */
  containerRef: RefObject<HTMLElement | null>;
  /** Re-measure when this changes (e.g. the current pathname). */
  activeKey: string;
}

/**
 * A dimensional pill that glides to sit behind the active nav item. Measured
 * (not layoutId) so it works with the domAnimation feature set. Hidden until a
 * link is actually active; instant snap under reduced motion.
 */
export function NavIndicator({ containerRef, activeKey }: NavIndicatorProps) {
  const reduceMotion = useReducedMotion();
  const [rect, setRect] = useState<{ x: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const active = container.querySelector<HTMLElement>("[aria-current='page']");
      if (!active) {
        setRect(null);
        return;
      }
      setRect({ x: active.offsetLeft, width: active.offsetWidth });
    };

    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, activeKey]);

  if (!rect) return null;

  return (
    <m.div
      className="nav-indicator"
      aria-hidden="true"
      initial={false}
      animate={{ x: rect.x, width: rect.width }}
      transition={reduceMotion ? { duration: 0 } : spring.indicator}
    />
  );
}
