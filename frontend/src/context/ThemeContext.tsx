import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { prefersReducedMotionNow, startThemeReveal, type RevealOrigin } from "@/lib/themeTransition";

/**
 * Theme state for the CloudBook token system.
 *
 * `data-theme` on <html> drives styles/tokens.css. The pre-paint script in
 * index.html sets it before first render.
 *
 * Switching the theme runs a circular View-Transitions reveal from the origin
 * point (the toggle's position) when the API is available AND the user has not
 * asked for reduced motion; otherwise it swaps instantly. Either way the theme
 * always changes.
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
  const attr =
    typeof document !== "undefined" ? document.documentElement.getAttribute("data-theme") : null;
  return attr === "dark" ? "dark" : "light";
}

function applyThemeAttrs(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

interface ThemeContextValue {
  theme: Theme;
  /** Set the theme. Pass the pointer position to reveal from there. */
  setTheme: (theme: Theme, origin?: RevealOrigin) => void;
  /** Toggle light <-> dark. Pass the pointer position to reveal from there. */
  toggleTheme: (origin?: RevealOrigin) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitial);
  // The reveal applies the attribute synchronously (flushSync) inside the
  // transition; this effect covers the initial mount and any non-reveal path.
  const first = useRef(true);

  useEffect(() => {
    applyThemeAttrs(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    first.current = false;
  }, [theme]);

  const setTheme = useCallback(
    (next: Theme, origin?: RevealOrigin) => {
      if (next === theme) return;
      const animate = origin && !prefersReducedMotionNow();
      if (animate) {
        void startThemeReveal(next, origin, () => {
          applyThemeAttrs(next);
          setThemeState(next);
        });
      } else {
        setThemeState(next);
      }
    },
    [theme],
  );

  const toggleTheme = useCallback(
    (origin?: RevealOrigin) => setTheme(theme === "dark" ? "light" : "dark", origin),
    [theme, setTheme],
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
