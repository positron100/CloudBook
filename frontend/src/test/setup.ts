import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// jsdom lacks matchMedia; nothing in the app needs it yet, but Bootstrap's JS
// (loaded via CDN in index.html, not in tests) and future hooks will.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom has no IntersectionObserver — framer-motion's `whileInView` uses one.
// A no-op stub keeps it inert (elements just never "enter view" in tests, which
// is fine: the motion primitives render their content regardless).
if (typeof window !== "undefined" && !("IntersectionObserver" in window)) {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
}

// The app reads VITE_API_URL at module load; give tests a stable value.
vi.stubEnv("VITE_API_URL", "http://test.local");
