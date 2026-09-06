import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domMax } from "framer-motion";
import { describe, expect, it, vi } from "vitest";
import { SortMenu } from "./SortMenu";

const wrap = (ui: React.ReactNode) => (
  <LazyMotion features={domMax} strict>
    {ui}
  </LazyMotion>
);

describe("SortMenu", () => {
  it("shows the current sort and opens a menu of the three options", async () => {
    render(wrap(<SortMenu value="newest" onChange={vi.fn()} />));
    const trigger = screen.getByRole("button", { name: /sort: newest first/i });
    expect(screen.queryByRole("menu")).toBeNull();
    await userEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(3);
    expect(screen.getByRole("menuitemradio", { name: /newest first/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("picks an option and closes, returning focus to the trigger", async () => {
    const onChange = vi.fn();
    render(wrap(<SortMenu value="newest" onChange={onChange} />));
    const trigger = screen.getByRole("button", { name: /^sort:/i });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("menuitemradio", { name: "A–Z" }));
    expect(onChange).toHaveBeenCalledWith("title");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it("is keyboard operable — Enter opens, ArrowDown roves, Escape closes", async () => {
    render(wrap(<SortMenu value="newest" onChange={vi.fn()} />));
    const trigger = screen.getByRole("button", { name: /^sort:/i });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const items = screen.getAllByRole("menuitemradio");
    expect(items[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(trigger).toHaveFocus();
  });
});
