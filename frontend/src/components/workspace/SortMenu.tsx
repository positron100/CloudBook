import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Icon } from "@/components/ui";
import { useMagnetic } from "@/hooks/useMagnetic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SORT_OPTIONS, type SortKey } from "@/lib/notesQuery";
import { resolvePanelFit } from "@/lib/panelPlacement";
import "./SortMenu.css";

interface SortMenuProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
}

const ROW_PX = 36;
const PANEL_PADDING_PX = 16;
const PANEL_GAP_PX = 8;

/**
 * Liquid-glass sort control — a magnetic pill trigger and a floating glass
 * panel, in the TextUtils navigation idiom (translucent float surface, blur +
 * saturation, inner top-edge light, layered shadow). Full keyboard menu:
 * roving ↑/↓/Home/End, Escape / Tab / click-outside close, focus returns to
 * the trigger.
 */
export function SortMenu({ value, onChange }: SortMenuProps) {
  const reduce = useReducedMotion();
  const magnetic = useMagnetic({ strength: 4 });
  const [open, setOpen] = useState(false);
  // Preference is down (the toolbar usually sits near the top of the page);
  // flip up only when measured space says down genuinely won't fit — same
  // idiom as the note editor's TagSelect.
  const [placement, setPlacement] = useState<"up" | "down">("down");
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  // Same convention as TagSelect/TagMenu's `dir`: +1 opens upward, -1 down.
  const dir = placement === "up" ? 1 : -1;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const need = SORT_OPTIONS.length * ROW_PX + PANEL_PADDING_PX;
      const fit = resolvePanelFit(rect, "down", need, PANEL_GAP_PX);
      setPlacement(fit.placement);
      setMaxHeight(fit.maxHeightPx);
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

  const pick = (v: SortKey) => {
    onChange(v);
    close();
  };

  return (
    <div className="sort-menu" ref={rootRef}>
      <m.button
        ref={(node) => {
          (magnetic.ref as React.MutableRefObject<HTMLElement | null>).current = node;
          triggerRef.current = node;
        }}
        type="button"
        className="sort-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Sort: ${current.label}`}
        onClick={() => (open ? close() : openMenu())}
        onMouseMove={magnetic.onMouseMove}
        onMouseLeave={magnetic.onMouseLeave}
        style={magnetic.style}
        layout={reduce ? false : true}
        transition={{ layout: { type: "spring", stiffness: 420, damping: 32, mass: 0.7 } }}
        whileTap={reduce ? undefined : { y: 1 }}
      >
        <Icon name="sort" size={15} />
        <m.span className="sort-menu__value" layout={reduce ? false : "position"}>
          {current.label}
        </m.span>
        <Icon name="chevron-down" size={14} className="sort-menu__caret" data-open={open || undefined} />
      </m.button>

      <AnimatePresence>
        {open && (
          <m.div
            ref={panelRef}
            id={menuId}
            className="sort-menu__panel"
            data-placement={placement}
            data-clamped={maxHeight != null || undefined}
            style={maxHeight != null ? { maxHeight, overflowY: "auto" } : undefined}
            role="menu"
            aria-label="Sort notes"
            onKeyDown={onKeyDown}
            // Same slow overshoot as TagSelect / TagMenu — see TagMenu.tsx.
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
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={opt.value === value}
                className="sort-menu__item"
                onClick={() => pick(opt.value)}
              >
                <span>{opt.label}</span>
                {opt.value === value && <Icon name="check" size={15} />}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
