import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { m } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { duration, ease } from "@/utils/motion";
import "./RouteTransition.css";

type Phase = "rest" | "out" | "in";

interface RouteTransitionValue {
  /**
   * Navigate to `path` behind a soft spatial dissolve — the current surface
   * recedes and softens, the route swaps in the trough, the new surface rises
   * and sharpens. Instant under reduced motion, and skipped entirely between
   * the two auth modes (that is an internal mode switch, not a route change).
   */
  transitionTo: (path: string) => void;
  phase: Phase;
  /** Reported by <RouteTransitionStage> when a dissolve leg finishes. */
  onLegDone: (phase: Phase) => void;
}

const RouteTransitionContext = createContext<RouteTransitionValue | null>(null);

function useCtx() {
  const ctx = useContext(RouteTransitionContext);
  if (!ctx) throw new Error("RouteTransition components must be used within <RouteTransitionProvider>");
  return ctx;
}

export function useRouteTransition(): Pick<RouteTransitionValue, "transitionTo"> {
  return { transitionTo: useCtx().transitionTo };
}

const AUTH_PATHS = new Set(["/login", "/register"]);

const REST = { opacity: 1, scale: 1, filter: "blur(0px)" } as const;
const RECEDED = { opacity: 0.32, scale: 0.99, filter: "blur(3px)" } as const;

export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("rest");
  const target = useRef<string | null>(null);

  const transitionTo = useCallback(
    (path: string) => {
      const here = location.pathname;
      // Auth mode switch (login <-> register) or reduced motion → no dissolve.
      if (reduce || (AUTH_PATHS.has(here) && AUTH_PATHS.has(path))) {
        navigate(path);
        return;
      }
      setPhase((p) => {
        if (p !== "rest") return p;
        target.current = path;
        return "out";
      });
    },
    [reduce, navigate, location.pathname],
  );

  const onLegDone = useCallback(
    (done: Phase) => {
      if (done === "out") {
        if (target.current) navigate(target.current);
        target.current = null;
        setPhase("in");
      } else if (done === "in") {
        setPhase("rest");
      }
    },
    [navigate],
  );

  return (
    <RouteTransitionContext.Provider value={{ transitionTo, phase, onLegDone }}>
      {children}
    </RouteTransitionContext.Provider>
  );
}

/**
 * Wraps the routed page content. All the dissolve motion happens on this one
 * wrapper — scale, opacity and a brief blur. The nav and the desk backdrop sit
 * outside it and never move, so the change reads as a shift of focus between
 * two sheets on the same desk rather than a page swipe.
 */
export function RouteTransitionStage({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const { phase, onLegDone } = useCtx();

  if (reduce) return <div className="route-stage">{children}</div>;

  const t =
    phase === "out"
      ? { duration: duration.fast * 0.85, ease: ease.exit }
      : phase === "in"
        ? { duration: duration.base, ease: ease.entrance }
        : { duration: 0 };

  return (
    <m.div
      className="route-stage"
      initial={false}
      animate={phase === "out" ? RECEDED : REST}
      transition={t}
      onAnimationComplete={() => {
        if (phase === "out" || phase === "in") onLegDone(phase);
      }}
    >
      {children}
    </m.div>
  );
}
