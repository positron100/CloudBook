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

// The app reads VITE_API_URL at module load; give tests a stable value.
vi.stubEnv("VITE_API_URL", "http://test.local");
