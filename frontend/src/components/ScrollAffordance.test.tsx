import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domAnimation } from "framer-motion";
import { describe, expect, it, vi } from "vitest";
import { ScrollAffordance } from "./ScrollAffordance";

const wrap = (ui: React.ReactNode) => (
  <LazyMotion features={domAnimation} strict>
    {ui}
  </LazyMotion>
);

describe("ScrollAffordance", () => {
  it("advances the section on click when visible", async () => {
    const onClick = vi.fn();
    render(wrap(<ScrollAffordance visible onClick={onClick} />));
    const btn = screen.getByRole("button", { name: /next section/i });
    expect(btn).toHaveAttribute("tabindex", "0");
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("drops out of the tab order when hidden", () => {
    render(wrap(<ScrollAffordance visible={false} onClick={() => {}} />));
    expect(screen.getByRole("button", { name: /next section/i })).toHaveAttribute("tabindex", "-1");
  });
});
