import { IconButton } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";

/** The theme switch. Passes its own position so the circular reveal starts here. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <IconButton
      icon={theme === "dark" ? "sun" : "moon"}
      label={`Switch to ${next} theme`}
      className={className}
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
