import { describe, expect, it, vi } from "vitest";
import { supportsViewTransitions, prefersReducedMotionNow, startThemeReveal } from "./themeTransition";

// jsdom has no document.startViewTransition, so this exercises the fallback path.

describe("supportsViewTransitions", () => {
  it("is false in jsdom", () => {
    expect(supportsViewTransitions()).toBe(false);
  });
});

describe("prefersReducedMotionNow", () => {
  it("reads the media query (false with the test stub)", () => {
    expect(prefersReducedMotionNow()).toBe(false);
  });
});

describe("startThemeReveal", () => {
  it("applies the theme synchronously when View Transitions are unavailable", async () => {
    const applyTheme = vi.fn();
    await startThemeReveal("dark", { x: 10, y: 10 }, applyTheme);
    expect(applyTheme).toHaveBeenCalledOnce();
  });
});
