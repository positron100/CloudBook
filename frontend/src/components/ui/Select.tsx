import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/utils/cn";
import { Icon } from "./Icon";
import "./Select.css";

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  label: string;
  hideLabel?: boolean;
  options: { value: string; label: string }[];
  className?: string;
}

/** Styled native <select> — keyboard + screen-reader support for free. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hideLabel, options, className, id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <div className={cn("select", className)}>
      <label htmlFor={id} className={cn("select__label", hideLabel && "sr-only")}>
        {label}
      </label>
      <div className="select__control">
        <select id={id} ref={ref} className="select__native" {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={16} className="select__chevron" />
      </div>
    </div>
  );
});
