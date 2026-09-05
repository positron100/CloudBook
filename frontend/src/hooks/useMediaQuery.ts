import { useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query. Use with the named queries in
 * utils/breakpoints.ts rather than hand-writing width strings in components.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => {
      if (typeof window === "undefined" || !window.matchMedia) return false;
      return window.matchMedia(query).matches;
    },
    () => false,
  );
}
