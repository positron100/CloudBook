import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domAnimation } from "framer-motion";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Reveal, Stagger, Pressable, FadePresence } from "./index";

const wrap = (ui: ReactNode) => (
  <LazyMotion features={domAnimation} strict>
    {ui}
  </LazyMotion>
);

const realMatchMedia = window.matchMedia;
function setReducedMotion(on: boolean) {
  window.matchMedia = ((q: string) =>
    ({
      matches: on && q.includes("reduced-motion"),
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}
afterEach(() => {
  window.matchMedia = realMatchMedia;
  vi.restoreAllMocks();
});

describe("Reveal", () => {
  it("renders children (animated path)", () => {
    render(wrap(<Reveal>hello</Reveal>));
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("renders a plain element under reduced motion", () => {
    setReducedMotion(true);
    const { container } = render(wrap(<Reveal as="section">plain</Reveal>));
    expect(container.querySelector("section")?.textContent).toBe("plain");
  });
});

describe("Stagger", () => {
  it("renders all items", () => {
    render(
      wrap(
        <Stagger>
          <Stagger.Item>one</Stagger.Item>
          <Stagger.Item>two</Stagger.Item>
        </Stagger>,
      ),
    );
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("two")).toBeInTheDocument();
  });
});

describe("Pressable", () => {
  it("is a real button and forwards onClick", async () => {
    const onClick = vi.fn();
    render(wrap(<Pressable onClick={onClick}>go</Pressable>));
    await userEvent.click(screen.getByRole("button", { name: "go" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("stays a real button under reduced motion", () => {
    setReducedMotion(true);
    render(wrap(<Pressable>go</Pressable>));
    expect(screen.getByRole("button", { name: "go" })).toBeInTheDocument();
  });
});

describe("FadePresence", () => {
  it("renders the current view", () => {
    render(wrap(<FadePresence transitionKey="a">view A</FadePresence>));
    expect(screen.getByText("view A")).toBeInTheDocument();
  });
});
