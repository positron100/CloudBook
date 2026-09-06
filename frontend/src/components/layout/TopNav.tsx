import { useRef, useState, type MouseEvent } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui";
import { Magnetic } from "@/components/motion";
import { useAuth } from "@/context/AuthContext";
import { usePageCurtain } from "@/components/transitions/PageCurtain";
import { ThemeToggle } from "./ThemeToggle";
import { NavIndicator } from "./NavIndicator";
import "./TopNav.css";

/** Small drift — a nav label should lean toward the pointer, not chase it. */
const NAV_MAGNET_STRENGTH = 4;
const BRAND_MAGNET_STRENGTH = 5;

/** Modifier / non-primary click → let the browser open the link normally. */
function isPlainClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/** Persistent desktop / tablet navigation: a floating liquid-glass pill.
 * Mobile uses <BottomNav>. */
export function TopNav() {
  const { pathname } = useLocation();
  const { curtainTo } = usePageCurtain();
  const { isAuthenticated, logout } = useAuth();
  const listRef = useRef<HTMLUListElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const links = [
    { to: "/", label: "Home", end: true },
    { to: "/about", label: "About", end: false },
    ...(isAuthenticated ? [{ to: "/profile", label: "Profile", end: false }] : []),
  ];

  // The halo only shows on a link that is hovered *and* not the current one.
  const haloKey = hovered && hovered !== pathname ? hovered : "";

  const go = (path: string) => (e: MouseEvent) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    if (path === pathname) return;
    curtainTo(path);
  };

  return (
    <header className="topnav">
      <div className="topnav__inner">
        <span className="topnav__edge" aria-hidden="true" />

        <Magnetic as="span" strength={BRAND_MAGNET_STRENGTH} className="topnav__magnet">
          <NavLink to="/" className="topnav__brand" onClick={go("/")}>
            cloudbook
          </NavLink>
        </Magnetic>

        <nav className="topnav__nav" aria-label="Primary">
          <ul className="topnav__list" ref={listRef} onMouseLeave={() => setHovered(null)}>
            <NavIndicator
              containerRef={listRef}
              activeKey={haloKey}
              targetSelector="[data-halo='true']"
              className="nav-indicator--halo"
              fade
            />
            <NavIndicator containerRef={listRef} activeKey={pathname} />
            {links.map((link) => (
              <li key={link.to} className="topnav__item">
                <Magnetic as="span" strength={NAV_MAGNET_STRENGTH} className="topnav__magnet">
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className="topnav__link"
                    data-halo={link.to === haloKey ? "true" : undefined}
                    onClick={go(link.to)}
                    onMouseEnter={() => setHovered(link.to)}
                    onFocus={() => setHovered(link.to)}
                    onBlur={() => setHovered(null)}
                  >
                    {link.label}
                  </NavLink>
                </Magnetic>
              </li>
            ))}
          </ul>
        </nav>

        <div className="topnav__actions">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                curtainTo("/login");
              }}
            >
              Sign out
            </Button>
          ) : (
            <>
              <Magnetic>
                <Button variant="ghost" size="sm" onClick={() => curtainTo("/login")}>
                  Log in
                </Button>
              </Magnetic>
              <Magnetic>
                <Button variant="primary" size="sm" onClick={() => curtainTo("/register")}>
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
