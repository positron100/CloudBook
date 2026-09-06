import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domAnimation } from "framer-motion";
import { describe, expect, it } from "vitest";
import { Field } from "./Field";

const wrap = (ui: React.ReactNode) => (
  <LazyMotion features={domAnimation} strict>
    {ui}
  </LazyMotion>
);

function Controlled({ lift, previewText }: { lift?: boolean; previewText?: string }) {
  const [value, setValue] = useState("");
  return (
    <Field
      label="Email address"
      name="email"
      lift={lift}
      previewText={previewText}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

function Password() {
  const [value, setValue] = useState("");
  return (
    <Field
      label="Password"
      name="password"
      type="password"
      iconStart="lock"
      lift
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

describe("Field", () => {
  it("labels the control and stays keyboard-reachable", async () => {
    render(wrap(<Controlled />));
    const input = screen.getByLabelText(/email address/i);
    await userEvent.tab();
    expect(input).toHaveFocus();
  });

  it("adds the field--lift class only when asked", () => {
    const { rerender, container } = render(wrap(<Controlled />));
    expect(container.querySelector(".field--lift")).toBeNull();
    rerender(wrap(<Controlled lift />));
    expect(container.querySelector(".field--lift")).not.toBeNull();
  });

  it("keeps the real typed value authoritative (preview never writes to it)", async () => {
    render(wrap(<Controlled lift previewText="you@example.com" />));
    const input = screen.getByLabelText(/email address/i) as HTMLInputElement;
    await userEvent.type(input, "real@user.com");
    expect(input.value).toBe("real@user.com");
    // the ghost preview layer is not present once there is a real value
    expect(document.querySelector(".field__preview")).toBeNull();
  });

  it("does not flag keyboard focus after a pointer press", async () => {
    render(wrap(<Controlled lift />));
    const input = screen.getByLabelText(/email address/i);
    await userEvent.click(input);
    expect(input).not.toHaveAttribute("data-kbd-focus");
  });

  it("flags keyboard focus after Tab", async () => {
    render(wrap(<Controlled lift />));
    const input = screen.getByLabelText(/email address/i);
    await userEvent.tab();
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("data-kbd-focus", "true");
  });

  describe("password reveal", () => {
    it("toggles the input type from an independent trailing button, lock stays leading", async () => {
      const { container } = render(wrap(<Password />));
      const input = screen.getByLabelText(/^password$/i) as HTMLInputElement;
      const toggle = screen.getByRole("button", { name: /show password/i });

      expect(input.type).toBe("password");
      expect(container.querySelector(".field__icon--start")).not.toBeNull();
      expect(container.querySelector(".field__control--has-reveal")).not.toBeNull();
      expect(container.querySelector(".field__icon--end")).toBeNull();

      await userEvent.click(toggle);
      expect(input.type).toBe("text");
      expect(screen.getByRole("button", { name: /hide password/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      await userEvent.click(screen.getByRole("button", { name: /hide password/i }));
      expect(input.type).toBe("password");
    });

    it("does not steal the caret from the input on click", async () => {
      render(wrap(<Password />));
      const input = screen.getByLabelText(/^password$/i);
      await userEvent.type(input, "hunter2");
      await userEvent.click(screen.getByRole("button", { name: /show password/i }));
      expect(input).toHaveFocus();
      expect((input as HTMLInputElement).value).toBe("hunter2");
    });
  });
});
