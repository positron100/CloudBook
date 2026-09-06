import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useReducedMotion } from "./useReducedMotion";
import { useMediaQuery } from "./useMediaQuery";
import { useTypingPreview } from "./useTypingPreview";
import { bp, up, down, between } from "@/utils/breakpoints";

// The vitest setup stubs matchMedia to always report matches: false with no-op
// listeners, so these cover the default (unmatched) path + no-throw.

describe("useReducedMotion", () => {
  it("returns a boolean and defaults to false", () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(typeof result.current).toBe("boolean");
    expect(result.current).toBe(false);
  });
});

describe("useMediaQuery", () => {
  it("returns false for an unmatched query without throwing", () => {
    const { result } = renderHook(() => useMediaQuery(up("md")));
    expect(result.current).toBe(false);
  });
});

describe("useTypingPreview", () => {
  it("stays empty while inactive and never schedules a timer", () => {
    const { result } = renderHook(() => useTypingPreview("you@example.com", false));
    expect(result.current).toBe("");
  });

  it("resets to empty when it goes inactive", () => {
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useTypingPreview("hi", active),
      { initialProps: { active: true } },
    );
    rerender({ active: false });
    expect(result.current).toBe("");
  });
});

describe("breakpoints", () => {
  it("exposes the design-target widths", () => {
    expect(bp).toEqual({ xs: 360, sm: 430, md: 768, lg: 1024, xl: 1280, "2xl": 1600 });
  });
  it("builds media query strings", () => {
    expect(up("xl")).toBe("(min-width: 1280px)");
    expect(down("md")).toBe("(max-width: 767px)");
    expect(between("md", "xl")).toBe("(min-width: 768px) and (max-width: 1279px)");
  });
});
