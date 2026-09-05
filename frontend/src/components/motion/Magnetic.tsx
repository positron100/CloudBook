import { m } from "framer-motion";
import { type ReactNode, type Ref } from "react";
import { useMagnetic } from "@/hooks/useMagnetic";

interface MagneticProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  disabled?: boolean;
  as?: "div" | "span";
}

/**
 * Thin wrapper over useMagnetic for the common case. For an element that is
 * already a motion element with its own animation, use the hook directly so
 * there is no extra wrapper node.
 */
export function Magnetic({ children, className, strength, disabled, as = "div" }: MagneticProps) {
  const { ref, onMouseMove, onMouseLeave, style } = useMagnetic({ strength, disabled });
  const Tag = m[as];

  return (
    <Tag
      ref={ref as Ref<HTMLDivElement>}
      className={className}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={style}
    >
      {children}
    </Tag>
  );
}
