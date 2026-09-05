import { Link } from "react-router-dom";
import "./Footer.css";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner container-px">
        <span className="footer__mark">© {new Date().getFullYear()} CloudBook</span>
        <nav className="footer__nav" aria-label="Footer">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </div>
    </footer>
  );
}
