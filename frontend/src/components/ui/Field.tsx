import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/utils/cn";
import { Icon } from "./Icon";
import "./Field.css";

interface CommonProps {
  label: string;
  /** Visually hide the label (still read by screen readers). */
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
}

type InputFieldProps = CommonProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & { as?: "input" };
type TextareaFieldProps = CommonProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & { as: "textarea" };

type FieldProps = InputFieldProps | TextareaFieldProps;

/**
 * Label + control + hint/error, wired for accessibility (ids, aria-describedby,
 * aria-invalid). The one form-control primitive — `as="textarea"` for
 * multi-line. States: default / focus (accent border + wash) / invalid /
 * disabled.
 */
export const Field = forwardRef<HTMLInputElement | HTMLTextAreaElement, FieldProps>(function Field(
  { label, hideLabel, hint, error, required, className, as = "input", id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const controlProps = {
    id,
    ref: ref as never,
    className: "field__control",
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    required,
    ...rest,
  };

  return (
    <div className={cn("field", required && "field--required", error && "field--invalid", className)}>
      <label htmlFor={id} className={cn("field__label", hideLabel && "sr-only")}>
        {label}
      </label>

      {as === "textarea" ? (
        <textarea {...(controlProps as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input {...(controlProps as InputHTMLAttributes<HTMLInputElement>)} />
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
