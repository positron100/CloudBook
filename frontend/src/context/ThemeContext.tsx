import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Theme state for the CloudBook token system.
 *
 * `data-theme` on <html> drives styles/tokens.css. `data-bs-theme` is set to
 * the same value so the still-present Bootstrap components stay themed until
 * Bootstrap is removed (see styles/BOOTSTRAP_INVENTORY.md). The pre-paint
 * script in index.html sets both before first render — this effect keeps them
 * in sync and persists the choice.
 *
 * The circular theme-reveal transition (View Transitions API) lands in P1.2;
 * the API surface here ({ theme, toggleTheme }) stays stable across that.
 */
type Theme = "light" | "dark";
const STORAGE_KEY = "theme";

function readInitial(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  // Fall back to whatever the pre-paint script already put on <html>, then light.
  const attr =
    typeof document !== "undefined" ? document.documentElement.getAttribute("data-theme") : null;
  return attr === "dark" ? "dark" : "light";
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitial);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-bs-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
