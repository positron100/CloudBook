import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";
import "./Card.css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Raises elevation 1 → 2 on hover. */
  interactive?: boolean;
  /** Selected state — elevation 3 + accent ring. */
  selected?: boolean;
  children: ReactNode;
}

/**
 * A note-sheet surface. P1.3 gives it elevation + hover/selected states; the
 * pointer tilt (CSS 3D) lands with the notes workspace in P1.4.
 */
export function Card({ interactive, selected, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn("card", interactive && "card--interactive", selected && "card--selected", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
