import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Icon } from "@/components/ui";
import { useMagnetic } from "@/hooks/useMagnetic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import "./TagMenu.css";

interface TagMenuProps {
  tags: string[];
  activeTag: string;
  onTag: (value: string) => void;
}

/** Rough panel height for the fits-above check — n rows + padding. Doesn't
 *  need to be exact, just enough to decide up vs down before the panel has
 *  ever been measured (same idiom as the note editor's TagSelect). */
const ROW_PX = 36;
const PANEL_PADDING_PX = 16;
const PANEL_GAP_PX = 8;

/**
 * Compact liquid-glass tag filter — the same trigger+panel idiom as
 * `SortMenu` (translucent float surface, blur + saturation, layered shadow),
 * sized for a single-row mobile control group. Replaces the chip row on
 * narrow viewports; desktop keeps the chips.
 */
export function TagMenu({ tags, activeTag, onTag }: TagMenuProps) {
  const reduce = useReducedMotion();
  const magnetic = useMagnetic({ strength: 4 });
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"up" | "down">("down");
  // +1 opens upward (panel rests above the trigger, entrance travels up into
  // place); -1 opens downward — same convention as TagSelect's own `dir`.
  const dir = placement === "up" ? 1 : -1;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const options = ["all", ...tags];
  const currentLabel = activeTag === "all" ? "All" : activeTag;

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const need = options.length * ROW_PX + PANEL_PADDING_PX + PANEL_GAP_PX;
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      // Prefer down (the row usually sits near the top of the page); flip up
      // only when down genuinely doesn't fit.
      setPlacement(spaceBelow >= need || spaceBelow >= spaceAbove ? "down" : "up");
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('[role="menuitemradio"]')?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = [...(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  const pick = (v: string) => {
    onTag(v);
    close();
  };

  return (
    <div className="tag-menu" ref={rootRef}>
      <m.button
        ref={(node) => {
          (magnetic.ref as React.MutableRefObject<HTMLElement | null>).current = node;
          triggerRef.current = node;
        }}
        type="button"
        className="tag-menu__trigger"
        data-active={activeTag !== "all" || undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Filter by tag: ${currentLabel}`}
        onClick={() => (open ? close() : openMenu())}
        onMouseMove={magnetic.onMouseMove}
        onMouseLeave={magnetic.onMouseLeave}
        style={magnetic.style}
        whileTap={reduce ? undefined : { y: 1 }}
      >
        <Icon name="filter" size={14} />
        <span className="tag-menu__value">{currentLabel}</span>
        <Icon name="chevron-down" size={14} className="tag-menu__caret" data-open={open || undefined} />
      </m.button>

      <AnimatePresence>
        {open && (
          <m.div
            ref={panelRef}
            id={menuId}
            className="tag-menu__panel"
            data-placement={placement}
            role="menu"
            aria-label="Filter notes by tag"
            onKeyDown={onKeyDown}
            // The same slow, soft overshoot as the note editor's own tag
            // control (TagSelect) — expands past rest, settles back, holds;
            // closing retraces the identical path in reverse, so picking a
            // tag reads as the panel physically returning into the control
            // rather than fading away. `dir` mirrors the shape for an
            // upward-opening panel.
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, y: 20 * dir, scaleY: 0.62, scaleX: 0.96 }
            }
            animate={
              reduce
                ? { opacity: 1 }
                : {
                    opacity: [0, 1, 1, 1],
                    y: [20 * dir, -8 * dir, 2 * dir, 0],
                    scaleY: [0.62, 1.08, 0.985, 1],
                    scaleX: [0.96, 1.02, 0.997, 1],
                    transition: { duration: 0.46, times: [0, 0.58, 0.86, 1], ease: [0.22, 1, 0.36, 1] },
                  }
            }
            exit={
              reduce
                ? { opacity: 0 }
                : {
                    opacity: [1, 1, 1, 0],
                    y: [0, 2 * dir, -8 * dir, 20 * dir],
                    scaleY: [1, 0.985, 1.08, 0.62],
                    scaleX: [1, 0.997, 1.02, 0.96],
                    transition: { duration: 0.4, times: [0, 0.14, 0.42, 1], ease: [0.64, 0, 0.78, 0] },
                  }
            }
            transition={{ duration: 0.16 }}
          >
            {options.map((name) => (
              <button
                key={name}
                type="button"
                role="menuitemradio"
                aria-checked={activeTag === name}
                className="tag-menu__item"
                onClick={() => pick(name)}
              >
                <span>{name === "all" ? "All" : name}</span>
                {activeTag === name && <Icon name="check" size={15} />}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
