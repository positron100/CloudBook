import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";
import "./Surface.css";

interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  /** Elevation level: 0 flat · 1 resting · 2 hover · 3 selected/editor · 4 modal. */
  level?: 0 | 1 | 2 | 3 | 4;
  as?: ElementType;
  children: ReactNode;
}

/**
 * A themed panel that sits at a defined elevation. `--sheet` background plus the
 * matching `--elev-*` shadow — the one place surface + shadow are paired, so
 * every panel in the app agrees on the lighting model.
 */
export function Surface({ level = 1, as: Tag = "div", className, children, ...rest }: SurfaceProps) {
  return (
    <Tag className={cn("surface", `surface--${level}`, className)} {...rest}>
      {children}
    </Tag>
  );
}
