import { useEffect, useRef, useState } from "react";

/** How long a burst of typing must go quiet before the environment reacts —
 *  coalesces "H", "He", "Hel", "Hello" into one recomposition, not five. */
const COALESCE_MS = 260;

/**
 * The environment should feel connected to *writing*, not to every field in
 * the app. Note title/body (composer and editor share these classes) and the
 * contact letter are the deliberate "yes"; the search pill is included too
 * but weighted the same as everything else (there is no louder/quieter
 * reaction, just whether a field participates at all) — it is the one
 * "optional" surface from the spec, kept in because excluding it bought
 * nothing. Auth/login/register/password fields are never in this list, so
 * they can't fire the signal at all — not merely a smaller reaction, no
 * reaction, since a background shift while typing a password is the kind of
 * "dramatic"/distracting response the spec explicitly rules out.
 */
const WRITE_SELECTOR = ".diary__title, .diary__body, .written-line__input, .search-pill__input";

/**
 * A single global "the user is writing" signal, listened for once at the app
 * root rather than wired into every field individually. A real `input` event
 * (typing, paste, IME composition, programmatic value changes that dispatch
 * one) bubbling from one of the writing surfaces above bumps a pending
 * counter; after `COALESCE_MS` of quiet, `seed` increments exactly once for
 * that whole burst. Consumers (the ambient cube field) react to `seed`
 * changing, not to every keystroke — see AmbientCubeField.
 */
export function useTypingSignal(): number {
  const [seed, setSeed] = useState(0);
  const timeoutRef = useRef(0);

  useEffect(() => {
    const onInput = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(WRITE_SELECTOR)) return;
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setSeed((s) => s + 1), COALESCE_MS);
    };
    document.addEventListener("input", onInput);
    return () => {
      document.removeEventListener("input", onInput);
      window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return seed;
}
