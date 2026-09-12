import { useRef, useState, type MouseEvent } from "react";
import { AnimatePresence, m } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import { Button, IconButton } from "@/components/ui";
import { Magnetic } from "@/components/motion";
import { useAuth } from "@/context/AuthContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { spring } from "@/utils/motion";
import { useRouteTransition } from "@/components/transitions/RouteTransition";
import { useDragTurn } from "@/hooks/useDragTurn";
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

/** Cursor-tracking glass highlight — the TextUtils nav idiom. Written straight
 *  to the node, no React state per move. */
function trackLight(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
  el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
}

/** Persistent desktop / tablet navigation: a floating liquid-glass pill.
 * Mobile uses <BottomNav>. */
export function TopNav() {
  const { pathname } = useLocation();
  const { transitionTo } = useRouteTransition();
  const { isAuthenticated, status, logout } = useAuth();
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [hovered, setHovered] = useState<string | null>(null);

  // Home has nothing to show logged out — it only enters the nav once the user
  // is authenticated (RequireAuth still guards the route itself either way).
  // "loading" means a stored token is still being validated on a refresh: keep
  // Home in place so it does not bubble in on every reload — the bubble is for
  // a genuine sign-in, where auth goes anonymous -> authenticated.
  const authedNav = isAuthenticated || status === "loading";
  const links = [
    ...(authedNav ? [{ to: "/", label: "Home", end: true }] : []),
    { to: "/about", label: "Contact us", end: false },
    ...(authedNav ? [{ to: "/profile", label: "Profile", end: false }] : []),
  ];

  // Drag across the list to turn the page by hand (click still navigates).
  const drag = useDragTurn({
    listRef,
    paths: links.map((l) => l.to),
    getItem: (path) => itemRefs.current[path] ?? null,
    current: pathname,
  });

  // The halo only shows on a link that is hovered *and* not the current one
  // (and never during a drag — the pill itself is following the pointer).
  const haloKey = hovered && hovered !== pathname && !drag.dragging ? hovered : "";

  const go = (path: string) => (e: MouseEvent) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    if (path === pathname) return;
    drag.guardClick(() => transitionTo(path))();
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
          <ul className="topnav__list" ref={listRef} onMouseLeave={() => setHovered(null)} {...drag.handlers}>
            <NavIndicator
              containerRef={listRef}
              activeKey={haloKey}
              targetSelector="[data-halo='true']"
              className="nav-indicator--halo"
              fade
            />
            <NavIndicator
              containerRef={listRef}
              // the drag flag is part of the key on purpose: on release the
              // pathname may be unchanged (cancel) or already changed (commit
              // navigated at gesture start), so ending the drag is what forces
              // one fresh measurement for the pill to spring onto
              activeKey={`${drag.dragging}:${pathname}`}
              override={drag.indicator}
            />
            {/* initial={false}: items present on first paint (e.g. an
                already-authenticated refresh) do not animate; an item added
                later — Home / Profile arriving on sign-in — bubbles in while
                its neighbours slide over via the layout transition. */}
            <AnimatePresence initial={false}>
              {links.map((link) => (
                <m.li
                  key={link.to}
                  className="topnav__item"
                  layout={reduce ? false : "position"}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.55 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.55 }}
                  transition={
                    reduce
                      ? { duration: 0.12 }
                      : { scale: spring.bubble, opacity: { duration: 0.18 }, layout: spring.settle }
                  }
                >
                  <Magnetic as="span" strength={NAV_MAGNET_STRENGTH} className="topnav__magnet">
                    <NavLink
                      ref={(el) => {
                        itemRefs.current[link.to] = el;
                      }}
                      to={link.to}
                      end={link.end}
                      className="topnav__link"
                      // an <a> is draggable by default — a press-drag starting on
                      // it would begin a native link drag and never reach the
                      // page-turn gesture
                      draggable={false}
                      data-halo={link.to === haloKey ? "true" : undefined}
                      onClick={go(link.to)}
                      onMouseMove={trackLight}
                      onMouseEnter={() => setHovered(link.to)}
                      onFocus={() => setHovered(link.to)}
                      onBlur={() => setHovered(null)}
                    >
                      {link.label}
                    </NavLink>
                  </Magnetic>
                </m.li>
              ))}
            </AnimatePresence>
          </ul>
        </nav>

        <div className="topnav__actions">
          <Magnetic as="span" strength={NAV_MAGNET_STRENGTH} className="topnav__ctrl-magnet">
            <ThemeToggle className="topnav__ctrl" onMouseMove={trackLight} />
          </Magnetic>
          {authedNav ? (
            <Magnetic as="span" strength={NAV_MAGNET_STRENGTH} className="topnav__ctrl-magnet">
              <IconButton
                icon="logout"
                label="Sign out"
                className="topnav__ctrl"
                onMouseMove={trackLight}
                onClick={() => {
                  logout();
                  transitionTo("/login");
                }}
              />
            </Magnetic>
          ) : (
            <>
              <Magnetic>
                <Button variant="ghost" size="sm" onClick={() => transitionTo("/login")}>
                  Log in
                </Button>
              </Magnetic>
              <Magnetic>
                <Button variant="primary" size="sm" onClick={() => transitionTo("/register")}>
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
