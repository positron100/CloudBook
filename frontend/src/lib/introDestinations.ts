/**
 * The opening animation's destination registry.
 *
 * The signature intro (book → torn page → destination surface) must know where
 * the user is actually going *before* it starts, so the page never terminates
 * into the wrong surface. `resolveIntroDestination` answers that from the URL
 * and the auth state; the registry then says which real on-screen surface the
 * flying page should reform onto and where the circular reveal should originate.
 *
 * Adding a destination: extend `IntroDestination`, add a registry entry with a
 * selector for the real surface, and a `resolveIntroDestination` rule. No new
 * router — this reads the existing routes.
 */

export type IntroDestination = "notes" | "auth" | "contact" | "profile";

export interface IntroTarget {
  /** Selector for the real destination surface the flying page reforms onto. */
  selector: string;
  /** Used only in the screen-reader announcement while the intro plays. */
  label: string;
}

export const introDestinations: Record<IntroDestination, IntroTarget> = {
  notes: { selector: ".diary__page", label: "your notebook" },
  auth: { selector: "[data-intro-target='auth']", label: "the sign-in page" },
  contact: { selector: ".contact-letter__card", label: "the letter" },
  profile: { selector: "[data-intro-target='profile']", label: "your profile" },
};

/**
 * Where is the user going? Resolved from the pathname + auth state before the
 * intro renders. `/` and `/profile` depend on authentication; everything else
 * is decided by the route alone.
 */
export function resolveIntroDestination(
  pathname: string,
  isAuthenticated: boolean,
): IntroDestination {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/login" || p === "/register" || p === "/signup") return "auth";
  if (p === "/about") return "contact";
  if (p === "/profile") return isAuthenticated ? "profile" : "auth";
  if (p === "/") return isAuthenticated ? "notes" : "auth";
  // Dev harnesses / unknown paths — never block the entrance.
  return isAuthenticated ? "notes" : "auth";
}
