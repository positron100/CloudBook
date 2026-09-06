import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { resolveIntroDestination, type IntroDestination } from "@/lib/introDestinations";
import { IntroScene } from "./IntroScene";

/** Never run inside Vitest — it would sit on top of every rendered test tree. */
const DISABLED = import.meta.env.MODE === "test";

/**
 * Decides whether the signature opening animation runs, resolves the
 * destination first (URL + auth), then hands off to <IntroScene>.
 *
 * This lives directly under <Router> (not inside <Routes>), so it mounts once
 * per document and never remounts on navigation — its own state is what stops
 * it replaying on ordinary route changes, opening a note, returning from the
 * editor, sorting or filtering. A full reload gives it a fresh mount, so the
 * intro plays again on reload / fresh entry, as intended.
 */
export function IntroOrchestrator() {
  const reduce = useReducedMotion();
  const { status, isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  const [phase, setPhase] = useState<"pending" | "playing" | "done">(() =>
    reduce || DISABLED ? "done" : "pending",
  );
  const destRef = useRef<IntroDestination | null>(null);

  useEffect(() => {
    if (phase !== "pending") return;

    const begin = (authed: boolean) => {
      destRef.current = resolveIntroDestination(pathname, authed);
      setPhase("playing");
    };

    // Auth state is the only fact that changes the destination. Wait for it to
    // settle, but never longer than 1s — a stalled token check must not trap
    // the user behind the book.
    if (status === "loading") {
      const t = window.setTimeout(() => begin(false), 1000);
      return () => window.clearTimeout(t);
    }
    begin(isAuthenticated);
  }, [phase, status, isAuthenticated, pathname]);

  if (phase !== "playing" || !destRef.current) return null;
  return <IntroScene destination={destRef.current} onDone={() => setPhase("done")} />;
}
