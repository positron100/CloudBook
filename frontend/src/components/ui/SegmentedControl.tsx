import { Icon, type IconName } from "./Icon";
import "./SegmentedControl.css";

interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  segments: Segment<T>[];
}

/**
 * A small two-or-more-option switch (e.g. grid / list). Radiogroup semantics,
 * selected state exposed via aria-checked, styling in SegmentedControl.css.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  segments,
}: SegmentedControlProps<T>) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {segments.map((seg) => (
        <button
          key={seg.value}
          type="button"
          role="radio"
          aria-checked={seg.value === value}
          aria-label={seg.label}
          className="segmented__option"
          onClick={() => onChange(seg.value)}
        >
          {seg.icon && <Icon name={seg.icon} size={16} className="segmented__icon" />}
          <span className="segmented__text">{seg.label}</span>
        </button>
      ))}
    </div>
  );
}
