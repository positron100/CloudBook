import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";
import "./Chip.css";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "accent" | "neutral";
  children: ReactNode;
}

/** Small label — note tags, filters, metadata. Not interactive by itself. */
export function Chip({ tone = "neutral", className, children, ...rest }: ChipProps) {
  return (
    <span className={cn("chip", `chip--${tone}`, className)} {...rest}>
      {children}
    </span>
  );
}
