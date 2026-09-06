import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Page-level section navigation. ArrowDown / ArrowUp move between the elements
 * matched by `selector` (default `[data-section]`); a chevron affordance can
 * call `goNext`. Native keyboard behaviour is left completely alone while the
 * user is in an editable control or a dialog.
 *
 * Returns the live active index (from an IntersectionObserver), the count,
 * whether the last section is showing, and the movement callbacks.
 */
export function useSectionNav(selector = "[data-section]") {
  const [active, setActive] = useState(0);
  const [count, setCount] = useState(0);
  const sectionsRef = useRef<HTMLElement[]>([]);

  const collect = useCallback(() => {
    sectionsRef.current = Array.from(document.querySelectorAll<HTMLElement>(selector));
    setCount(sectionsRef.current.length);
  }, [selector]);

  const scrollTo = useCallback((index: number) => {
    const list = sectionsRef.current;
    const clamped = Math.max(0, Math.min(index, list.length - 1));
    const target = list[clamped];
    if (!target) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, []);

  const goNext = useCallback(() => scrollTo(active + 1), [active, scrollTo]);
  const goPrev = useCallback(() => scrollTo(active - 1), [active, scrollTo]);

  useEffect(() => {
    collect();

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const i = sectionsRef.current.indexOf(visible.target as HTMLElement);
          if (i >= 0) setActive(i);
        }
      },
      { threshold: [0.25, 0.5, 0.75] },
    );
    sectionsRef.current.forEach((el) => io.observe(el));

    const editable = (el: EventTarget | null): boolean => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      if (node.closest("input, textarea, select, [contenteditable=''], [contenteditable='true'], dialog"))
        return true;
      const tag = node.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (editable(e.target) || editable(document.activeElement)) return;
      if (document.querySelector("dialog[open]")) return;
      e.preventDefault();
      scrollTo(activeRef.current + (e.key === "ArrowDown" ? 1 : -1));
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", collect);
    return () => {
      io.disconnect();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", collect);
    };
  }, [collect, scrollTo]);

  // keydown handler closes over `active` — keep a ref so it stays current
  // without re-binding the listener on every section change.
  const activeRef = useRef(active);
  activeRef.current = active;

  return { active, count, atEnd: count > 0 && active >= count - 1, goNext, goPrev };
}
