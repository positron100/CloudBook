import { useEffect, useRef } from "react";

/**
 * Calls `onResume` when the app plausibly just came back — tab regained
 * visibility, the window regained focus, or the network came back online.
 * The three events commonly fire together (switching back to the tab is a
 * visibilitychange *and* a focus), so calls within `dedupeMs` of each other
 * collapse into one.
 *
 * This only decides *when* to ask; throttling *how often* a real request may
 * go out (so a quick series of tab switches can't hammer the API) is the
 * caller's job — `onResume` should already guard that itself.
 */
export function useResumeRevalidation(onResume: () => void, dedupeMs = 250): void {
  const callbackRef = useRef(onResume);
  callbackRef.current = onResume;
  const lastFireRef = useRef(0);

  useEffect(() => {
    const fire = () => {
      const now = Date.now();
      if (now - lastFireRef.current < dedupeMs) return;
      lastFireRef.current = now;
      callbackRef.current();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") fire();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", fire);
    window.addEventListener("online", fire);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", fire);
      window.removeEventListener("online", fire);
    };
  }, [dedupeMs]);
}
