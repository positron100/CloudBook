import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

const toggleTheme = vi.fn();
vi.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn(), toggleTheme }),
}));

describe("ThemeToggle", () => {
  it("reveals from the toggle's own geometry on keyboard activation", async () => {
    toggleTheme.mockClear();
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /switch to dark theme/i });
    // jsdom returns a zero rect, but the call must still pass a numeric origin
    // derived from the button — never a hard-coded viewport point.
    btn.getBoundingClientRect = () =>
      ({ left: 800, top: 20, width: 36, height: 36, right: 836, bottom: 56, x: 800, y: 20, toJSON() {} }) as DOMRect;
    btn.focus();
    await userEvent.keyboard("{Enter}");
    expect(toggleTheme).toHaveBeenCalledTimes(1);
    const origin = toggleTheme.mock.calls[0][0];
    expect(origin.x).toBe(818); // 800 + 36/2
    expect(origin.y).toBe(38); // 20 + 36/2
  });
});
