import { AnimatePresence, m } from "framer-motion";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { duration, ease } from "@/utils/motion";

interface FadePresenceProps {
  /** Changing this key triggers the exit/enter cross-fade. */
  transitionKey: string;
  children: ReactNode;
  className?: string;
  /** Rise distance in px on enter; 0 for a pure fade. */
  y?: number;
}

/**
 * Cross-fade between screens/views keyed by `transitionKey`. `mode="wait"` so
 * the outgoing view finishes leaving before the incoming enters. Reduced
 * motion → swap with no animation. Used for route/view transitions in P1.3+.
 */
export function FadePresence({ transitionKey, children, className, y = 8 }: FadePresenceProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={transitionKey}
        className={className}
        initial={{ opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -y, transition: { duration: duration.fast, ease: ease.exit } }}
        transition={{ duration: duration.base, ease: ease.entrance }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
