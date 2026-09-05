import { m } from "framer-motion";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { duration, ease } from "@/utils/motion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger offset in seconds when several Reveals share a container. */
  delay?: number;
  /** Rise distance in px. */
  y?: number;
  /** Animate when scrolled into view (default) vs. immediately on mount. */
  onView?: boolean;
  as?: "div" | "section" | "li" | "span" | "p";
}

/**
 * Fade + short rise for a block of content. Transform/opacity only — never
 * touches layout. Under reduced motion it renders the final state with no
 * animation. This is the standard entrance; components use it rather than
 * hand-writing `initial`/`animate`.
 */
export function Reveal({ children, className, delay = 0, y = 16, onView = true, as = "div" }: RevealProps) {
  const reduceMotion = useReducedMotion();
  const Tag = m[as];

  if (reduceMotion) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  const anim = {
    initial: { opacity: 0, y },
    ...(onView
      ? { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.25 } }
      : { animate: { opacity: 1, y: 0 } }),
    transition: { duration: duration.section, ease: ease.standard, delay },
  } as const;

  return (
    <Tag className={className} {...anim}>
      {children}
    </Tag>
  );
}
