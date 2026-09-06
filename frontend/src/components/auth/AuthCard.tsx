import { useEffect, useRef } from "react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { AuthSwitchButton } from "./AuthSwitchButton";
import "./AuthCard.css";

export type AuthMode = "login" | "register";

const COPY = {
  login: {
    heading: "Hello, friend.",
    sub: "New here? Set up a desk of your own — it only takes a moment.",
    ctaLabel: "Create account",
    ctaTo: "/register",
  },
  register: {
    heading: "Welcome back.",
    sub: "Already have a desk? Everything is exactly where you left it.",
    ctaLabel: "Log in",
    ctaTo: "/login",
  },
} as const;

const SIDES = ["login", "register"] as const;

/**
 * The authentication stage — a fixed-size clipping viewport (`overflow:
 * hidden`). The outer box never changes size between login and register; only
 * the layers inside move, and only on transforms.
 *
 * The transition is a CURTAIN SWEEP, not a two-panel slide:
 *
 *   - `.auth-stage__curtain` is a full-width accent surface that rests half
 *     off one edge (showing half the card) and, on a mode change, slides all
 *     the way to the opposite edge — passing through a moment where it covers
 *     the ENTIRE card.
 *   - `.auth-stage__copy` (two of them, both mounted) ride opposite that sweep:
 *     the outgoing welcome text travels out one side while the incoming text
 *     enters from the other, both moving through the same blue field.
 *   - the two forms cross-fade + drift underneath; the curtain hides the swap.
 *
 * All of it is CSS: `data-mode` on the root drives every transform, timed with
 * the motion tokens (`--dur-section` / the curtain easing — see
 * `authCurtain` in utils/motion.ts). Compositor-only; the reduced-motion
 * backstop in global.css collapses it to an instant state change. Both forms
 * and both copies stay mounted (no remount-to-switch); the inactive side is
 * `inert` so it takes no focus or pointer.
 *
 * Composition + motion character come from the reference recording; the visual
 * language (tokens, surfaces, accent, radii, Poppins) is CloudBook's.
 */
export function AuthCard({ mode }: { mode: AuthMode }) {
  const rootRef = useRef<HTMLElement>(null);
  const isRegister = mode === "register";

  // Everything tagged with the non-active side is inert — keeps keyboard focus
  // and pointer events off the hidden form and the duplicate welcome CTA.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-auth-side]").forEach((el) => {
      el.inert = el.dataset.authSide !== mode;
    });
  }, [mode]);

  return (
    <section
      ref={rootRef}
      className="auth-stage"
      data-mode={mode}
      data-intro-target="auth"
      aria-label={isRegister ? "Create an account" : "Log in"}
    >
      <div className="auth-stage__viewport">
        <div data-auth-side="register" className="auth-stage__form auth-stage__form--register">
          <RegisterForm />
        </div>
        <div data-auth-side="login" className="auth-stage__form auth-stage__form--login">
          <LoginForm />
        </div>

        <div className="auth-stage__curtain" aria-hidden="true" />

        <div className="auth-stage__welcome">
          {SIDES.map((side) => (
            <div
              key={side}
              data-auth-side={side}
              className={`auth-stage__copy auth-stage__copy--${side}`}
            >
              <span className="auth-stage__wordmark">cloudbook</span>
              <h2 className="auth-stage__heading">{COPY[side].heading}</h2>
              <p className="auth-stage__sub">{COPY[side].sub}</p>
              <AuthSwitchButton to={COPY[side].ctaTo}>{COPY[side].ctaLabel}</AuthSwitchButton>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
