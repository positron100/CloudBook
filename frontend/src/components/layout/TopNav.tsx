import { useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";
import { Magnetic } from "@/components/motion";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { NavIndicator } from "./NavIndicator";
import "./TopNav.css";

/** Persistent desktop / tablet navigation. Mobile uses <BottomNav>. */
export function TopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const listRef = useRef<HTMLUListElement>(null);

  const links = [
    { to: "/", label: "Home", end: true },
    { to: "/about", label: "About", end: false },
    ...(isAuthenticated ? [{ to: "/profile", label: "Profile", end: false }] : []),
  ];

  return (
    <header className="topnav">
      <div className="topnav__inner container-px">
        <NavLink to="/" className="topnav__brand">
          cloudbook
        </NavLink>

        <nav className="topnav__nav" aria-label="Primary">
          <ul className="topnav__list" ref={listRef}>
            <NavIndicator containerRef={listRef} activeKey={pathname} />
            {links.map((link) => (
              <li key={link.to} className="topnav__item">
                <NavLink to={link.to} end={link.end} className="topnav__link">
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="topnav__actions">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/login"); }}>
              Sign out
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                Log in
              </Button>
              <Magnetic>
                <Button variant="primary" size="sm" onClick={() => navigate("/register")}>
                  Sign up
                </Button>
              </Magnetic>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
