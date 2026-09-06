import { useEffect, useState } from "react";

/**
 * Types `text` out one character at a time while `active` is true — a ghost /
 * example-text preview shown *over* an empty field, never in it. The real
 * input value is untouched; the caller gates `active` on `!value`, so the
 * instant the user types a real character the preview resets to empty and
 * disappears.
 *
 * Idle cost is zero: when `active` is false the effect early-returns after one
 * `setState`, and there is no interval — each character schedules the next
 * with a single `setTimeout`.
 */
export function useTypingPreview(text: string, active: boolean, speedMs = 45): string {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!active) {
      setDisplay("");
      return;
    }

    let cancelled = false;
    let timeoutId: number;

    const typeNext = (index: number) => {
      if (cancelled) return;
      setDisplay(text.slice(0, index));
      if (index < text.length) {
        // Small random jitter so it reads as typed, not mechanically ticked.
        timeoutId = window.setTimeout(() => typeNext(index + 1), speedMs + Math.random() * 35);
      }
    };

    // A beat before it starts, so a pointer just passing over the field
    // doesn't flash a half-word.
    timeoutId = window.setTimeout(() => typeNext(1), 320);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [active, text, speedMs]);

  return display;
}
