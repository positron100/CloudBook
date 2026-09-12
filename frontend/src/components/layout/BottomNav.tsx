import { useRef, type MouseEvent } from "react";
import { AnimatePresence, m } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { spring } from "@/utils/motion";
import { useRouteTransition } from "@/components/transitions/RouteTransition";
import { useDragTurn } from "@/hooks/useDragTurn";
import { NavIndicator } from "./NavIndicator";
import "./BottomNav.css";

/** Modifier / non-primary click → let the browser open the link normally. */
const isPlainClick = (e: MouseEvent) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/** Mobile primary navigation. Replaces the collapsed hamburger entirely. */
export function BottomNav() {
  const { isAuthenticated, status } = useAuth();
  const { pathname } = useLocation();
  const { transitionTo } = useRouteTransition();
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // Home only exists in the bar once signed in (route stays guarded regardless).
  // "loading" = a stored token being re-validated on refresh — keep the authed
  // bar so Home does not bubble in on every reload, only on a real sign-in.
  const authedNav = isAuthenticated || status === "loading";
  const items: { to?: string; label: string; icon: IconName; end?: boolean; onClick?: () => void }[] =
    authedNav
      ? [
          { to: "/", label: "Home", icon: "home", end: true },
          { to: "/about", label: "Contact us", icon: "mail" },
          { to: "/profile", label: "Profile", icon: "user" },
        ]
      : [
          { to: "/about", label: "Contact us", icon: "mail" },
          { to: "/login", label: "Log in", icon: "user" },
        ];

  // same drag-to-turn gesture as the desktop nav, on its side (horizontal bar)
  const drag = useDragTurn({
    listRef,
    paths: items.flatMap((i) => (i.to ? [i.to] : [])),
    getItem: (path) => itemRefs.current[path] ?? null,
    current: pathname,
  });

  // same page-turn as the desktop nav
  const go = (path: string) => (e: MouseEvent) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    if (path === pathname) return;
    drag.guardClick(() => transitionTo(path))();
  };

  return (
    <nav className="bottomnav" aria-label="Primary">
      {/* Only the pill itself catches the pointer (see .bottomnav in the CSS,
          pointer-events:none) — the gutters around it stay part of the page,
          same "transparent positioning frame + floating pill" split as the
          desktop nav. */}
      <div className="bottomnav__pill">
        <ul className="bottomnav__list" ref={listRef} {...drag.handlers}>
          <NavIndicator
            containerRef={listRef}
            // the drag flag forces a fresh measurement on release, same as
            // the desktop pill — see TopNav for why
            activeKey={`${drag.dragging}:${pathname}`}
            override={drag.indicator}
          />
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <m.li
                key={item.label}
                className="bottomnav__item"
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
                {item.to ? (
                  <NavLink
                    ref={(el) => {
                      itemRefs.current[item.to!] = el;
                    }}
                    to={item.to}
                    end={item.end}
                    className="bottomnav__link"
                    draggable={false}
                    onClick={go(item.to)}
                  >
                    <Icon name={item.icon} size={22} />
                    <span className="bottomnav__label">{item.label}</span>
                  </NavLink>
                ) : (
                  <button type="button" className="bottomnav__link" onClick={item.onClick}>
                    <Icon name={item.icon} size={22} />
                    <span className="bottomnav__label">{item.label}</span>
                  </button>
                )}
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </nav>
  );
}
