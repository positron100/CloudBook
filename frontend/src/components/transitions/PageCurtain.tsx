import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { m } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { authCurtain } from "@/utils/motion";
import "./PageCurtain.css";

interface PageCurtainValue {
  /** Navigate to `path` behind an accent curtain sweep. Instant under reduced
   *  motion. */
  curtainTo: (path: string) => void;
}

const PageCurtainContext = createContext<PageCurtainValue | null>(null);

export function usePageCurtain(): PageCurtainValue {
  const ctx = useContext(PageCurtainContext);
  if (!ctx) throw new Error("usePageCurtain must be used within <PageCurtainProvider>");
  return ctx;
}

type Phase = "idle" | "cover" | "reveal";

/**
 * Leftward sweep — the same direction the approved auth curtain travels when
 * *entering* Login (register → login moves the panel left through full cover).
 * Enter from the right, cover, continue off the left; idle rests off the right
 * ready for the next run. Every position is off-screen except `cover`.
 */
const X: Record<Phase, string> = { idle: "105%", cover: "0%", reveal: "-105%" };
const EASE = [0.65, 0, 0.35, 1] as const;

/**
 * A root-level curtain that reuses the auth curtain's *motion language* — an
 * accent panel sweeps across, fully covers the viewport, the route changes
 * behind it, then it sweeps off the far side revealing the new surface. It is
 * a separate element from the (approved, untouched) Login↔Signup curtain.
 */
export function PageCurtainProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const target = useRef<string | null>(null);

  const curtainTo = useCallback(
    (path: string) => {
      if (reduce) {
        navigate(path);
        return;
      }
      setPhase((p) => {
        if (p !== "idle") return p;
        target.current = path;
        return "cover";
      });
    },
    [reduce, navigate],
  );

  // Half of the auth-curtain duration for each leg (cover / reveal).
  const legSeconds = authCurtain.durationMs / 1000 / 2;

  return (
    <PageCurtainContext.Provider value={{ curtainTo }}>
      {children}
      <div className="page-curtain-root" aria-hidden="true">
        <m.div
          className="page-curtain"
          initial={false}
          animate={{ x: X[phase] }}
          transition={phase === "idle" ? { duration: 0 } : { duration: legSeconds, ease: EASE }}
          onAnimationComplete={() => {
            if (phase === "cover") {
              if (target.current) navigate(target.current);
              target.current = null;
              setPhase("reveal");
            } else if (phase === "reveal") {
              setPhase("idle");
            }
          }}
        />
      </div>
    </PageCurtainContext.Provider>
  );
}
