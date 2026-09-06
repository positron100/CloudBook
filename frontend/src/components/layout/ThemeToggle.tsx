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
        const r = e.currentTarget.getBoundingClientRect();
        toggleTheme({
          x: e.clientX || r.left + r.width / 2,
          y: e.clientY || r.top + r.height / 2,
        });
      }}
    />
  );
}
