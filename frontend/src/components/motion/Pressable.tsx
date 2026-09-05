import { m } from "framer-motion";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ease, hoverLift } from "@/utils/motion";

// Drop the DOM drag/animation handlers whose names collide with Framer's
// gesture callbacks — Pressable does not expose them.
type ClashingHandlers =
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragExit"
  | "onDragLeave"
  | "onDragOver"
  | "onDrop"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration";

interface PressableProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, ClashingHandlers> {
  children: ReactNode;
  /** Add a small hover lift in addition to the press compress. */
  lift?: boolean;
}

/**
 * A <button> that compresses slightly on press and (optionally) lifts on
 * hover. Transform only. Reduced motion → a plain button with no scale/lift.
 * Always a real <button> for a11y.
 */
export const Pressable = forwardRef<HTMLButtonElement, PressableProps>(function Pressable(
  { children, lift = false, ...rest },
  ref,
) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <button ref={ref} {...rest}>
        {children}
      </button>
    );
  }

  return (
    <m.button
      ref={ref}
      whileTap={{ scale: 0.96 }}
      whileHover={lift ? hoverLift : undefined}
      transition={{ type: "spring", stiffness: 500, damping: 15, ease: ease.press }}
      {...rest}
    >
      {children}
    </m.button>
  );
});
