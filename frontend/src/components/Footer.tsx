import { Link } from "react-router-dom";

// Interim footer — redesigned in the UI/UX overhaul.
export default function Footer() {
  return (
    <footer className="border-top py-3 mt-4">
      <div className="container d-flex justify-content-between align-items-center flex-wrap gap-2">
        <span className="text-secondary">© {new Date().getFullYear()} CloudBook</span>
        <ul className="nav">
          <li className="nav-item">
            <Link className="nav-link px-2 text-secondary" to="/">
              Home
            </Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link px-2 text-secondary" to="/about">
              About
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
