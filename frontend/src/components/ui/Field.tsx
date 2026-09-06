import {
  forwardRef,
  useId,
  useState,
  type FocusEvent,
  type InputHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from "react";
import { m } from "framer-motion";
import { cn } from "@/utils/cn";
import { useMagnetic } from "@/hooks/useMagnetic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTypingPreview } from "@/hooks/useTypingPreview";
import { Icon, type IconName } from "./Icon";
import "./Field.css";

/**
 * Focus-origin tracker. Text inputs always match `:focus-visible` (you have to
 * see where you type), so it cannot tell a mouse click from a Tab. This does:
 * a keyboard event just before focus means the accent ring shows; a pointer
 * press means the lift alone carries it.
 */
let lastInputWasKeyboard = false;
if (typeof window !== "undefined") {
  const KEYS = new Set(["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"]);
  window.addEventListener("keydown", (e) => {
    if (KEYS.has(e.key)) lastInputWasKeyboard = true;
  }, true);
  window.addEventListener("pointerdown", () => {
    lastInputWasKeyboard = false;
  }, true);
}

interface CommonProps {
  label: string;
  /** Visually hide the label (still read by screen readers). */
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  /** Decorative icon shown inside the control, trailing edge. */
  icon?: IconName;
  /** Decorative icon shown inside the control, leading edge. */
  iconStart?: IconName;
  /**
   * Tactile treatment for the auth screens: a very small pointer magnetism on
   * the control and a focus Z-lift instead of a ring. Fine-pointer +
   * non-reduced-motion only — completely inert otherwise, and it never touches
   * layout or native input behaviour.
   */
  lift?: boolean;
  /**
   * Example text typed out as a ghost preview *over* the field while it is
   * empty and hovered/focused. Purely illustrative — the real input value is
   * never modified. Skipped under reduced motion.
   */
  previewText?: string;
}

type InputFieldProps = CommonProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & { as?: "input" };
type TextareaFieldProps = CommonProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & { as: "textarea" };

type FieldProps = InputFieldProps | TextareaFieldProps;

/**
 * Label + control + hint/error, wired for accessibility (ids, aria-describedby,
 * aria-invalid). The one form-control primitive — `as="textarea"` for
 * multi-line. States: default / focus / invalid / disabled. With `lift`, the
 * focus state communicates depth (a small rise) rather than a coloured ring.
 */
export const Field = forwardRef<HTMLInputElement | HTMLTextAreaElement, FieldProps>(function Field(
  {
    label,
    hideLabel,
    hint,
    error,
    required,
    className,
    icon,
    iconStart,
    lift = false,
    previewText,
    as = "input",
    id: idProp,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const reduce = useReducedMotion();
  const magnetic = useMagnetic({ strength: 3, disabled: !lift });
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [kbFocus, setKbFocus] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const r = rest as InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>;
  // A password input gets its own visibility toggle on the trailing edge; the
  // decorative icon (if any) moves to the leading edge so the two never share
  // a side.
  const isPassword = as === "input" && (rest as { type?: string }).type === "password";
  const leadingIcon = isPassword ? (iconStart ?? icon) : iconStart;
  const trailingIcon = isPassword ? undefined : icon;
  const value = r.value;
  const isEmpty = value == null || value === "";
  const previewActive = Boolean(previewText) && isEmpty && !reduce && (focused || hovered);
  const preview = useTypingPreview(previewText ?? "", previewActive);

  const handleFocus = (event: FocusEvent<HTMLInputElement & HTMLTextAreaElement>) => {
    setFocused(true);
    setKbFocus(lastInputWasKeyboard);
    r.onFocus?.(event);
  };
  const handleBlur = (event: FocusEvent<HTMLInputElement & HTMLTextAreaElement>) => {
    setFocused(false);
    setKbFocus(false);
    r.onBlur?.(event);
  };

  const controlProps = {
    id,
    ref: ref as never,
    className: cn(
      "field__control",
      leadingIcon && "field__control--icon-start",
      trailingIcon && "field__control--icon-end",
      isPassword && "field__control--has-reveal",
    ),
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    "data-kbd-focus": lift && kbFocus ? "true" : undefined,
    required,
    ...rest,
    ...(isPassword ? { type: revealed ? "text" : "password" } : null),
    onFocus: handleFocus,
    onBlur: handleBlur,
  };

  const control =
    as === "textarea" ? (
      <textarea {...(controlProps as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
    ) : (
      <input {...(controlProps as InputHTMLAttributes<HTMLInputElement>)} />
    );

  const wrapInner = (
    <div className="field__control-wrap">
      {leadingIcon && (
        <Icon name={leadingIcon} size={18} className="field__icon field__icon--start" />
      )}
      {control}
      {trailingIcon && <Icon name={trailingIcon} size={18} className="field__icon field__icon--end" />}
      {isPassword && (
        <button
          type="button"
          className="field__reveal"
          aria-label={revealed ? "Hide password" : "Show password"}
          aria-pressed={revealed}
          // keep the caret in the input — the toggle never takes focus on click
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setRevealed((v) => !v)}
        >
          <Icon name={revealed ? "eye-off" : "eye"} size={18} />
        </button>
      )}
      {preview && (
        <span className="field__preview" aria-hidden="true">
          {preview}
          <span className="field__preview-caret" />
        </span>
      )}
    </div>
  );

  return (
    <div className={cn("field", required && "field--required", error && "field--invalid", lift && "field--lift", className)}>
      <label htmlFor={id} className={cn("field__label", hideLabel && "sr-only")}>
        {label}
      </label>

      {lift ? (
        <m.div
          ref={magnetic.ref as Ref<HTMLDivElement>}
          className="field__lift"
          style={magnetic.style}
          onMouseMove={magnetic.onMouseMove as (e: MouseEvent<HTMLDivElement>) => void}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => {
            setHovered(false);
            magnetic.onMouseLeave();
          }}
        >
          {wrapInner}
        </m.div>
      ) : (
        wrapInner
      )}

      {hint && !error && (
        <span id={hintId} className="field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="field__error" role="alert">
          <Icon name="alert-circle" size={14} />
          {error}
        </span>
      )}
    </div>
  );
});
