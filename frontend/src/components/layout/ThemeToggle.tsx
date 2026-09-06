import type { MouseEvent } from "react";
import { IconButton } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  onMouseMove?: (e: MouseEvent<HTMLButtonElement>) => void;
}

/** The theme switch. Passes its own position so the circular reveal starts here. */
export function ThemeToggle({ className, onMouseMove }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <IconButton
      icon={theme === "dark" ? "sun" : "moon"}
      label={`Switch to ${next} theme`}
      className={className}
      onMouseMove={onMouseMove}
      onClick={(e) => {
        // Always start the reveal from the control's own centre — not the
        // pointer's click point. The button also rides a magnetic wrapper
        // (Magnetic as="span"), so back out that drift to reach its resting
        // centre.
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        let x = r.left + r.width / 2;
        let y = r.top + r.height / 2;
        const parent = el.parentElement;
        if (parent && typeof DOMMatrixReadOnly === "function") {
          try {
            const m = new DOMMatrixReadOnly(getComputedStyle(parent).transform);
            x -= m.m41;
            y -= m.m42;
          } catch {
            /* transform unparseable — the resting centre is close enough */
          }
        }
        toggleTheme({ x, y });
      }}
    />
  );
}
