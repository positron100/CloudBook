import { m } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { staggerContainer, staggerItem } from "@/utils/motion";

interface StaggerProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Seconds between each child. */
  gap?: number;
  delayChildren?: number;
  onView?: boolean;
  as?: "div" | "ul" | "ol" | "section";
}

/**
 * Container that reveals its <Stagger.Item> children in sequence. Pairs with
 * fadeUp-style item motion. Reduced motion → renders children immediately with
 * no stagger.
 */
export function Stagger({
  children,
  className,
  style,
  gap = 0.06,
  delayChildren = 0,
  onView = true,
  as = "div",
}: StaggerProps) {
  const reduceMotion = useReducedMotion();
  const Tag = m[as];

  if (reduceMotion) {
    const Plain = as;
    return (
      <Plain className={className} style={style}>
        {children}
      </Plain>
    );
  }

  return (
    <Tag
      className={className}
      style={style}
      variants={staggerContainer(gap, delayChildren)}
      initial="hidden"
      {...(onView
        ? { whileInView: "visible", viewport: { once: true, amount: 0.2 } }
        : { animate: "visible" })}
    >
      {children}
    </Tag>
  );
}

function StaggerItem({
  children,
  className,
  style,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "li" | "section";
}) {
  const reduceMotion = useReducedMotion();
  const Tag = m[as];
  if (reduceMotion) {
    const Plain = as;
    return (
      <Plain className={className} style={style}>
        {children}
      </Plain>
    );
  }
  return (
    <Tag className={className} style={style} variants={staggerItem}>
      {children}
    </Tag>
  );
}

Stagger.Item = StaggerItem;
