import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domAnimation } from "framer-motion";
import { describe, expect, it } from "vitest";
import { ContactLetter } from "./ContactLetter";

const wrap = (ui: React.ReactNode) => (
  <LazyMotion features={domAnimation} strict>
    {ui}
  </LazyMotion>
);

describe("ContactLetter", () => {
  it("starts closed and toggles open/closed from the button", async () => {
    render(wrap(<ContactLetter />));
    const toggle = screen.getByRole("button", { name: /open the letter/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(toggle);
    expect(screen.getByRole("button", { name: /seal the letter/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await userEvent.click(screen.getByRole("button", { name: /seal the letter/i }));
    expect(screen.getByRole("button", { name: /open the letter/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("exposes a labelled message form with real inputs", () => {
    render(wrap(<ContactLetter />));
    expect(screen.getByRole("form", { name: /send a message/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^message$/i)).toBeInTheDocument();
  });

  it("offers the direct address and the repo alongside the letter", () => {
    render(wrap(<ContactLetter />));
    expect(screen.getByRole("button", { name: /hello@cloudbook\.app/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /positron100\/CloudBook/i })).toHaveAttribute(
      "href",
      "https://github.com/positron100/CloudBook",
    );
  });
});
