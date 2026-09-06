import type { ReactNode, Ref } from "react";
import { m } from "framer-motion";
import { Link } from "react-router-dom";
import { useMagnetic } from "@/hooks/useMagnetic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { spring } from "@/utils/motion";

/**
 * The Login ↔ Signup mode-switch control on the welcome panel — a small
 * liquid-glass object. Two transform layers: an outer span carries the
 * magnetic drift (fine pointer only, via useMagnetic), an inner span the
 * hover Z-lift + press compress. The `<Link>` itself stays a plain link, so
 * navigation and a11y are untouched; the CSS `.btn--panel` gives the glass
 * surface + focus ring. Clicking it just changes the route — the approved
 * curtain sweep runs from that, unchanged.
 */
export function AuthSwitchButton({ to, children }: { to: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  const magnetic = useMagnetic({ strength: 4 });

  return (
    <m.span
      ref={magnetic.ref as Ref<HTMLSpanElement>}
      className="auth-stage__cta-magnet"
      style={magnetic.style}
      onMouseMove={magnetic.onMouseMove}
      onMouseLeave={magnetic.onMouseLeave}
    >
      <m.span
        className="auth-stage__cta-press"
        whileHover={reduce ? undefined : { y: -2, transition: spring.snappy }}
        whileTap={reduce ? undefined : { scale: 0.96 }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
      >
        <Link to={to} className="btn btn--panel auth-stage__cta">
          {children}
        </Link>
      </m.span>
    </m.span>
  );
}
