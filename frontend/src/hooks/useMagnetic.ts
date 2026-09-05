import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useSpring } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { budget } from "@/utils/motion";

const PULL_SPRING = { stiffness: 220, damping: 18, mass: 0.4 } as const;

interface UseMagneticOptions {
  /** Peak offset in px at the element's edge. */
  strength?: number;
  /** Neutralise the pull and spring back to rest while true. */
  disabled?: boolean;
}

/**
 * One magnetic interaction: an element drifts subtly toward the cursor while
 * hovered, springs back on leave. Fine-pointer + non-reduced-motion only —
 * inert on touch and under reduced motion. Attach `ref`, spread the returned
 * handlers, and apply `style` to a motion element.
 *
 * The rect is measured once when the pointer arrives (not per move) so the
 * pull never feeds back into its own measurement.
 */
export function useMagnetic({ strength = budget.magneticStrengthPx, disabled = false }: UseMagneticOptions = {}) {
  const ref = useRef<HTMLElement | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const reduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);

  const x = useSpring(0, PULL_SPRING);
  const y = useSpring(0, PULL_SPRING);

  useEffect(() => {
    setEnabled(
      !reduceMotion &&
        typeof window !== "undefined" &&
        !!window.matchMedia &&
        window.matchMedia("(pointer: fine)").matches,
    );
  }, [reduceMotion]);

  useEffect(() => {
    if (disabled) {
      x.set(0);
      y.set(0);
    }
  }, [disabled, x, y]);

  useEffect(() => {
    const invalidate = () => {
      rectRef.current = null;
    };
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate);
    return () => {
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
    };
  }, []);

  function onMouseMove(event: MouseEvent<Element>) {
    if (!enabled || disabled || !ref.current) return;
    const rect = (rectRef.current ??= ref.current.getBoundingClientRect());
    if (!rect.width || !rect.height) return;
    const relX = event.clientX - (rect.left + rect.width / 2);
    const relY = event.clientY - (rect.top + rect.height / 2);
    x.set((relX / (rect.width / 2)) * strength);
    y.set((relY / (rect.height / 2)) * strength);
  }

  function onMouseLeave() {
    rectRef.current = null;
    x.set(0);
    y.set(0);
  }

  return {
    ref,
    onMouseMove,
    onMouseLeave,
    style: enabled ? { x, y } : undefined,
    enabled,
  };
}
