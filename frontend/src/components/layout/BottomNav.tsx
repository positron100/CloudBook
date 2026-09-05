import { NavLink, useNavigate } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import "./BottomNav.css";

/** Mobile primary navigation. Replaces the collapsed hamburger entirely. */
export function BottomNav() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const items: { to?: string; label: string; icon: IconName; end?: boolean; onClick?: () => void }[] =
    isAuthenticated
      ? [
          { to: "/", label: "Home", icon: "home", end: true },
          { to: "/about", label: "About", icon: "book" },
          { to: "/profile", label: "Profile", icon: "user" },
          { label: "Sign out", icon: "logout", onClick: () => { logout(); navigate("/login"); } },
        ]
      : [
          { to: "/", label: "Home", icon: "home", end: true },
          { to: "/about", label: "About", icon: "book" },
          { to: "/login", label: "Log in", icon: "user" },
        ];

  return (
    <nav className="bottomnav" aria-label="Primary">
      <ul className="bottomnav__list">
        {items.map((item) => (
          <li key={item.label} className="bottomnav__item">
            {item.to ? (
              <NavLink to={item.to} end={item.end} className="bottomnav__link">
                <Icon name={item.icon} size={22} />
                <span>{item.label}</span>
              </NavLink>
            ) : (
              <button type="button" className="bottomnav__link" onClick={item.onClick}>
                <Icon name={item.icon} size={22} />
                <span>{item.label}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
