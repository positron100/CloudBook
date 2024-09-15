// rfce : react function export component
import React from 'react'
import { Link, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
function Navbar() {
  let Navigate = useNavigate()
  const handleLogout = () => {
    localStorage.removeItem('Token');
    Navigate('/login')
  }

  const location = useLocation();
  // would console the path of the component
  // useEffect(()=>{
  //   console.log(location.pathname)
  // },[location]);
  return (
    <>
      {/* Navbar code from bootstrap */}
      <nav className="navbar navbar-expand-lg " style={{ backgroundColor: "black" }}>
        <div className="container-fluid">
          <Link className="navbar-brand" to="/" style={{ color: "white" }}>CloudBook</Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation" style="background-color:white;">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                {/* can use ` ` only inside { } */}
                <Link className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} aria-current="page" to="/" style={{ color: "white" }}>Home</Link>
              </li>
              <li className="nav-item">
                {/* route to about component */}
                <Link className={`nav-link ${location.                    pathname === '/about' ? 'active' : ''}`} to="/about" style={{ color: "white" }}>About</Link>
              </li>
            </ul>

            {/* Display Logout button when the user is logged in */}
            {!localStorage.getItem('Token') ?
              <form className="d-flex" role="search">
                <Link className="btn btn-primary mx-2" to="/login" role="button">Login</Link>
                <Link className="btn btn-primary mx-2" to="/signup" role="button">Signup</Link>
              </form> : <button className="btn btn-primary mx-2" to="/login" onClick={handleLogout}>Logout</button>}
          </div>
        </div>
      </nav>

    </>
  )
}

export default Navbar