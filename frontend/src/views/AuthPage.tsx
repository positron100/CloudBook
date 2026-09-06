import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AuthCard } from "@/components/auth/AuthCard";
import "./AuthPage.css";

/**
 * /login and /register both render this component. React keeps the instance
 * mounted across the route change (same element type, same tree position), so
 * the AuthCard's panel animates between modes instead of remounting.
 */
export default function AuthPage() {
  const { pathname } = useLocation();
  const mode = pathname === "/register" ? "register" : "login";
  const prevMode = useRef(mode);

  // Move focus to the active form's heading when the mode actually changes
  // (never on first mount — that would steal focus from a deep link).
  useEffect(() => {
    if (prevMode.current === mode) return;
    prevMode.current = mode;
    const sel =
      mode === "register"
        ? ".auth-stage__form--register h1"
        : ".auth-stage__form--login h1";
    const h = document.querySelector<HTMLElement>(sel);
    if (h) {
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
    }
  }, [mode]);

  return (
    <div className="auth-page">
      <AuthCard mode={mode} />
      <Outlet />
    </div>
  );
}
