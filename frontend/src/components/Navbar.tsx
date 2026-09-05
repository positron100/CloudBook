import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const linkClass = (path: string) => `nav-link ${location.pathname === path ? "active" : ""}`;

  return (
    <nav className="navbar navbar-expand-lg" style={{ backgroundColor: "black" }}>
      <div className="container-fluid">
        <Link className="navbar-brand" to="/" style={{ color: "white" }}>
          CloudBook
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
          style={{ backgroundColor: "white" }}
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className={linkClass("/")} aria-current="page" to="/" style={{ color: "white" }}>
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link className={linkClass("/about")} to="/about" style={{ color: "white" }}>
                About
              </Link>
            </li>
          </ul>

          {isAuthenticated ? (
            <button className="btn btn-primary mx-2" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <div className="d-flex">
              <Link className="btn btn-primary mx-2" to="/login">
                Login
              </Link>
              <Link className="btn btn-primary mx-2" to="/signup">
                Signup
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
