import type { CSSProperties } from "react";
import { cn } from "@/utils/cn";
import "./Skeleton.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Shimmer placeholder for loading content. The shimmer is disabled under
 * reduced motion (a static tint remains) via Skeleton.css.
 */
export function Skeleton({ width, height, radius, className, style }: SkeletonProps) {
  return (
    <span
      className={cn("skeleton", className)}
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}
