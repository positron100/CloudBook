import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Icon } from "@/components/ui";
import { useMagnetic } from "@/hooks/useMagnetic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SORT_OPTIONS, type SortKey } from "@/lib/notesQuery";
import "./SortMenu.css";

interface SortMenuProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
}

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
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
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
        onClick={() => setOpen((v) => !v)}
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
            role="menu"
            aria-label="Sort notes"
            onKeyDown={onKeyDown}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
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
