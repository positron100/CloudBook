import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domMax } from "framer-motion";
import { describe, expect, it } from "vitest";
import { ContactLetter, ContactReach } from "./ContactLetter";

const wrap = (ui: React.ReactNode) => (
  <LazyMotion features={domMax} strict>
    {ui}
  </LazyMotion>
);

describe("ContactLetter", () => {
  it("reads as a letter — sentence lead-ins ARE the field labels, real inputs", () => {
    render(wrap(<ContactLetter />));
    expect(screen.getByRole("form", { name: /send a message/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/my name is/i).tagName).toBe("INPUT");
    expect(screen.getByLabelText(/reach me at/i)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/i wanted to say/i).tagName).toBe("TEXTAREA");
  });

  it("blocks submit and shows written errors until the letter is complete", async () => {
    render(wrap(<ContactLetter />));
    await userEvent.click(screen.getByRole("button", { name: /seal & send/i }));
    expect(await screen.findByText(/a name, however short/i)).toBeInTheDocument();
    expect(screen.getByText(/an address i can reply to/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/my name is/i), "Ada");
    await userEvent.type(screen.getByLabelText(/reach me at/i), "ada@example.com");
    await userEvent.type(screen.getByLabelText(/i wanted to say/i), "Hello there");
    expect(screen.queryByText(/a name, however short/i)).toBeNull();
  });

  it("addresses the reader by name", () => {
    render(wrap(<ContactLetter />));
    expect(screen.getByText(/dear mukul/i)).toBeInTheDocument();
    expect(screen.queryByText(/github|positron100/i)).toBeNull();
  });

  it("ContactReach — direct address copies to the clipboard, never opens a mail app", () => {
    render(wrap(<ContactReach />));
    // A button, not a mailto link — clicking it must never hand off to the
    // visitor's own mail client.
    const addr = screen.getByRole("button", { name: /mukuknegi2005@gmail\.com/i });
    expect(addr.tagName).toBe("BUTTON");
    expect(addr).not.toHaveAttribute("href");
    expect(screen.getAllByRole("button", { name: /copy email address/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/github|positron100/i)).toBeNull();
  });
});
