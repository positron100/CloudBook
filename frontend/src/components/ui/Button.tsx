import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Pressable } from "@/components/motion";
import { cn } from "@/utils/cn";
import "./Button.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  /** Adds a small hover lift (for standalone / hero CTAs). */
  lift?: boolean;
  children: ReactNode;
}

/**
 * The one button primitive. States: default / hover / active (press compress
 * via Pressable) / focus-visible (global ring) / disabled / loading. Never
 * make a one-off styled button — add a variant here.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", block, loading, lift, disabled, children, className, ...rest },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      lift={lift}
      className={cn(
        "btn",
        `btn--${variant}`,
        size === "sm" && "btn--sm",
        block && "btn--block",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {children}
    </Pressable>
  );
});
