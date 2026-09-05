import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useSpring } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { budget } from "@/utils/motion";

const TILT_SPRING = { stiffness: 180, damping: 20, mass: 0.3 } as const;
const PERSPECTIVE = 900;

/**
 * Subtle pointer tilt for a note card. Fine-pointer + non-reduced-motion only —
 * a no-op on touch and under reduced motion (handlers do nothing, no transform
 * is applied). Framer springs drive the transform: no React state per pointer
 * move, no rAF loop of our own, settles to idle when the spring rests.
 *
 * The rect is measured once when the pointer enters so the tilt can't feed back
 * into its own measurement.
 */
export function useNoteTilt() {
  const reduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const rectRef = useRef<DOMRect | null>(null);

  const rotateX = useSpring(0, TILT_SPRING);
  const rotateY = useSpring(0, TILT_SPRING);

  useEffect(() => {
    setEnabled(
      !reduceMotion &&
        typeof window !== "undefined" &&
        !!window.matchMedia &&
        window.matchMedia("(pointer: fine)").matches,
    );
  }, [reduceMotion]);

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

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!enabled) return;
    const rect = (rectRef.current ??= e.currentTarget.getBoundingClientRect());
    if (!rect.width || !rect.height) return;
    // -1..1 from centre.
    const px = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const py = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    // Pointer right → rotate around Y toward the pointer; pointer down → rotate
    // around X so the top tips away. Clamped to the design budget.
    rotateY.set(px * budget.cardTiltDeg);
    rotateX.set(-py * budget.cardTiltDeg);
  };

  const onPointerLeave = () => {
    rectRef.current = null;
    rotateX.set(0);
    rotateY.set(0);
  };

  return {
    enabled,
    handlers: { onPointerMove, onPointerLeave },
    style: enabled ? { rotateX, rotateY, transformPerspective: PERSPECTIVE } : undefined,
  };
}
