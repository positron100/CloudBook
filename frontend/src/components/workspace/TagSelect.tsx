import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AnimatePresence, m } from "framer-motion";
import { Icon } from "@/components/ui";
import { useMagnetic } from "@/hooks/useMagnetic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { PRESET_TAGS, matchPreset } from "@/lib/tags";
import { resolvePanelFit } from "@/lib/panelPlacement";
import "./TagSelect.css";

interface TagSelectProps {
  /** Current tag string (may be a preset, a custom value, or ""). */
  value: string;
  /** Emits the new tag string — a preset label, or the trimmed custom text. */
  onChange: (tag: string) => void;
  /** Wired to the visible field label. */
  id?: string;
  /** Accessible name for the control. */
  label?: string;
  /** Preferred direction for the panel to expand off the trigger. Default
   *  "up". This is a preference, not a guarantee — on open, the control
   *  measures the actual space above/below the trigger and flips to the
   *  other direction if the preferred side can't fit the panel, so it never
   *  opens off-screen regardless of where the control happens to sit. */
  placement?: "up" | "down";
}

/** Rough panel height for the fits-above check (8 presets + custom row +
 *  padding) — doesn't need to be exact, just enough to decide up vs down
 *  before the panel has ever been measured. */
const PANEL_ESTIMATE_PX = 320;
const PANEL_GAP_PX = 8;

/**
 * The Notes tag control: a polished listbox of the predefined CloudBook tags
 * plus a "Custom tag…" escape hatch. Same liquid-glass panel and paper trigger
 * as the sort menu; full keyboard listbox (↑/↓/Home/End, Enter/Space, Escape,
 * type-ahead), custom input reveals in place with no layout jump.
 *
 * The API `tag` field is unchanged — a preset emits its label, a custom tag
 * emits the trimmed text, and an existing note whose tag is not a preset opens
 * straight into custom mode with its value intact.
 */
export function TagSelect({
  value,
  onChange,
  id,
  label = "Tag",
  placement = "up",
}: TagSelectProps) {
  const reduce = useReducedMotion();
  const magnetic = useMagnetic({ strength: 4 });
  // The direction actually used — starts at the preference, resolved against
  // real available space each time the panel opens (see openPanel).
  const [resolved, setResolved] = useState<"up" | "down">(placement);
  // Set only when the chosen side still can't fit the panel's estimated
  // height clear of the sticky header / BottomNav — clamps to the visible
  // gap with internal scroll rather than letting the panel render behind them.
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  // +1 opens upward (panel rests above the trigger, entrance travels up into
  // place); -1 opens downward (mirrored). Bounce/exit math below is expressed
  // once in terms of this sign so both directions share the same trace-back.
  const dir = resolved === "up" ? 1 : -1;
  const preset = matchPreset(value);
  // Custom mode: value is set but not a preset, OR the user explicitly chose
  // "Custom tag…". Never inferred from an empty value.
  const [customMode, setCustomMode] = useState<boolean>(!!value && !preset);
  const [customDraft, setCustomDraft] = useState<string>(!preset ? value : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0); // roving focus index in the panel

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ term: "", at: 0 });
  const listId = useId();

  // The last value *this component* emitted. Every `onChange` call — picking a
  // preset, choosing "Custom tag…" (which starts the draft at ""), typing a
  // character — round-trips back in as the next `value` prop. Without this
  // guard the sync effect below would treat that echo as an external change
  // and immediately recompute `customMode` from the (often momentarily empty)
  // value, stomping the mode the user just chose — e.g. choosing "Custom
  // tag…" with no prior draft emits "", which reads as `!!"" === false` and
  // snapped the control straight back to the preset list.
  const lastEmitted = useRef(value);
  const emit = (tag: string) => {
    lastEmitted.current = tag;
    onChange(tag);
  };

  // Resync from the outside — a genuinely different note's tag, or the
  // composer's own post-submit reset — but never from our own echo.
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    const p = matchPreset(value);
    setCustomMode(!!value && !p);
    setCustomDraft(!p ? value : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // options = presets, then the "custom" row (index === PRESET_TAGS.length)
  const presets = useMemo<string[]>(() => [...PRESET_TAGS], []);
  const optionCount = presets.length + 1;
  const selectedIndex = preset ? presets.indexOf(preset) : customMode ? presets.length : -1;

  const openPanel = () => {
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    // Prefer `placement`, but flip if it genuinely won't fit — measured
    // against the trigger's live position (and the sticky header / BottomNav,
    // which eat into the raw viewport edges), not assumed from where it
    // usually sits, so the panel never opens behind them or off-screen.
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const fit = resolvePanelFit(rect, placement, PANEL_ESTIMATE_PX, PANEL_GAP_PX);
      setResolved(fit.placement);
      setMaxHeight(fit.maxHeightPx);
    } else {
      setResolved(placement);
      setMaxHeight(null);
    }
    setOpen(true);
  };
  const closePanel = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>('[data-idx="' + active + '"]')?.focus();
  }, [open, active]);

  const choosePreset = (tag: string) => {
    setCustomMode(false);
    setCustomDraft("");
    emit(tag);
    closePanel();
  };

  const chooseCustom = () => {
    setCustomMode(true);
    emit(customDraft.trim());
    setOpen(false);
    // let the input mount, then focus it
    window.requestAnimationFrame(() => customRef.current?.focus());
  };

  const commitCustom = (raw: string) => {
    const v = raw.trim();
    setCustomDraft(raw);
    emit(v);
  };

  const backToList = () => {
    setCustomMode(false);
    setCustomDraft("");
    if (!preset) emit("");
    triggerRef.current?.focus();
    setOpen(true);
    setActive(0);
  };

  const onPanelKey = (e: ReactKeyboardEvent) => {
    const n = optionCount;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + n) % n);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(n - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (active === presets.length) chooseCustom();
      else choosePreset(presets[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePanel();
    } else if (e.key === "Tab") {
      closePanel(false);
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now();
      const t = typeahead.current;
      t.term = now - t.at > 700 ? e.key : t.term + e.key;
      t.at = now;
      const hit = PRESET_TAGS.findIndex((p) => p.toLowerCase().startsWith(t.term.toLowerCase()));
      if (hit >= 0) setActive(hit);
    }
  };

  const triggerLabel = customMode
    ? customDraft.trim() || "Custom tag"
    : preset || "Select a tag";

  return (
    <div className="tag-select" ref={rootRef}>
      {customMode ? (
        <span className="tag-select__custom">
          <button
            type="button"
            className="tag-select__back"
            aria-label="Back to the tag list"
            onClick={backToList}
          >
            <Icon name="chevron-down" size={14} />
          </button>
          <input
            ref={customRef}
            id={id}
            className="tag-select__custom-input"
            placeholder="Type a tag…"
            aria-label={`${label} — custom`}
            value={customDraft}
            maxLength={24}
            autoComplete="off"
            onChange={(e) => commitCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                backToList();
              } else if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </span>
      ) : (
        <m.button
          ref={(node) => {
            (magnetic.ref as React.MutableRefObject<HTMLElement | null>).current = node;
            triggerRef.current = node;
          }}
          id={id}
          type="button"
          className="tag-select__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={`${label}: ${triggerLabel}`}
          data-empty={!preset || undefined}
          onClick={() => (open ? closePanel() : openPanel())}
          onKeyDown={(e) => {
            if ((e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") && !open) {
              e.preventDefault();
              openPanel();
            }
          }}
          onMouseMove={magnetic.onMouseMove}
          onMouseLeave={magnetic.onMouseLeave}
          style={magnetic.style}
        >
          <Icon name="sparkle" size={13} className="tag-select__icon" />
          <span className="tag-select__value">{preset || "Select a tag"}</span>
          <Icon
            name="chevron-down"
            size={14}
            className="tag-select__caret"
            data-open={open || undefined}
          />
        </m.button>
      )}

      <AnimatePresence>
        {open && (
          <m.div
            ref={panelRef}
            id={listId}
            className="tag-select__panel"
            data-placement={resolved}
            data-clamped={maxHeight != null || undefined}
            style={maxHeight != null ? { maxHeight, overflowY: "auto" } : undefined}
            role="listbox"
            aria-label="Choose a tag"
            aria-activedescendant={`${listId}-${active}`}
            tabIndex={-1}
            onKeyDown={onPanelKey}
            // Expands off the trigger with a slow, soft overshoot — past rest,
            // a small settle-back, then still — long enough to actually watch.
            // Closing plays the identical path in reverse (same keyframe
            // values, same shape, mirrored order/timing), so picking a tag
            // reads as the panel physically retracing itself into the control
            // rather than fading away.
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
                    transition: {
                      duration: 0.46,
                      times: [0, 0.58, 0.86, 1],
                      ease: [0.22, 1, 0.36, 1],
                    },
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
                    transition: {
                      duration: 0.4,
                      times: [0, 0.14, 0.42, 1],
                      ease: [0.64, 0, 0.78, 0],
                    },
                  }
            }
            transition={{ duration: 0.16 }}
          >
            {PRESET_TAGS.map((tag, i) => (
              <button
                key={tag}
                id={`${listId}-${i}`}
                type="button"
                role="option"
                data-idx={i}
                aria-selected={preset === tag}
                className="tag-select__option"
                tabIndex={-1}
                onClick={() => choosePreset(tag)}
                onMouseEnter={() => setActive(i)}
              >
                <span>{tag}</span>
                {preset === tag && <Icon name="check" size={15} />}
              </button>
            ))}
            <span className="tag-select__sep" role="separator" />
            <button
              id={`${listId}-${PRESET_TAGS.length}`}
              type="button"
              role="option"
              data-idx={PRESET_TAGS.length}
              aria-selected={customMode}
              className="tag-select__option tag-select__option--custom"
              tabIndex={-1}
              onClick={chooseCustom}
              onMouseEnter={() => setActive(PRESET_TAGS.length)}
            >
              <span>Custom tag…</span>
              {customMode && <Icon name="check" size={15} />}
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
