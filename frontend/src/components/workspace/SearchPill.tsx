import { useEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import { Icon } from "@/components/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import "./SearchPill.css";

interface SearchPillProps {
  value: string;
  onChange: (value: string) => void;
}

/** One spring for the whole unfold — width, icon settle and input reveal all
 *  ride it, so the pill reads as a single object changing shape rather than
 *  parts animating independently. */
const SEARCH_SPRING = { type: "spring", stiffness: 420, damping: 30, mass: 0.7 } as const;

/**
 * Mobile search, closed state `[ 🔍 ]` — a single persistent control, never a
 * conditional swap between an icon button and a separate input. The same
 * `<input>` is always mounted; only its width/opacity/tabIndex change, so the
 * icon → pill transition is one continuous transform (`layout` on the root
 * carries the width, the icon settles from centred to left-aligned as the
 * root's `justify-content` flips, the input fades/widens in place).
 */
export function SearchPill({ value, onChange }: SearchPillProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const openSearch = () => {
    if (open) return;
    setOpen(true);
    // Focus is immediate, never gated on the animation — the spring is purely
    // visual, the control is usable the instant the user asks for it.
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const closeSearch = () => {
    if (!value) setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeSearch();
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value]);

  const spring = reduce ? { duration: 0 } : SEARCH_SPRING;

  return (
    <m.div
      ref={rootRef}
      className="search-pill"
      data-open={open || undefined}
      layout={!reduce}
      transition={{ layout: spring }}
      onPointerDown={(e) => {
        // A press on the glass anywhere while closed opens it — the input
        // itself has no clickable width yet at that point.
        if (!open) {
          e.preventDefault();
          openSearch();
        }
      }}
    >
      <m.span
        className="search-pill__icon"
        aria-hidden="true"
        layout={!reduce}
        animate={{ scale: open ? 1 : 1 }}
        transition={spring}
      >
        <Icon name="search" size={18} />
      </m.span>
      <m.input
        ref={inputRef}
        className="search-pill__input"
        type="search"
        aria-label="Search notes"
        placeholder="Search notes…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={openSearch}
        onBlur={closeSearch}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        tabIndex={0}
        initial={false}
        animate={reduce ? { opacity: open ? 1 : 0 } : { opacity: open ? 1 : 0, width: open ? "100%" : 0 }}
        transition={
          reduce
            ? { duration: 0 }
            : { opacity: { duration: open ? 0.16 : 0.1, delay: open ? 0.08 : 0 }, width: spring }
        }
      />
    </m.div>
  );
}
