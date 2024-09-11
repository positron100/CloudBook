import React , {useState} from 'react'
import { useNavigate } from 'react-router-dom'

const Signup = (props) => {
  const Navigate = useNavigate();
  const [credentials, setCredentials] = useState({ Sname: "", Semail: "", Spassword: "" })
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    const response = await fetch("https://cloud-book-backend.onrender.com/api/auth/createuser", {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json'
      },
      body: JSON.stringify({ name: credentials.Sname, email: credentials.Semail, password: credentials.Spassword })
    });
    const json = await response.json();
    console.log(json)
    // Redirecting to the login route if user is Registered
    if(json.status)
    {
      //save the auth token and redirect
      Navigate('/login');
      props.showAlert('Your Account has been created' , 'success')
    }
    else{
      props.showAlert("Invalid Credentials" , "danger")
    }
  }
  const onChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value })
  } 
  return (
    <>
      <div className="container my-3 mt-3">
        <h2>Register to use CloudBook</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3 my-3">
            <label htmlFor="email" className="form-label">Name</label>
            <input type="text" className="form-control" id="Sname" name="Sname" onChange={onChange} />
            <div id="emailHelp" className="form-text">We'll never share your email with anyone else.</div>
          </div>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email address</label>
            <input type="email" className="form-control" id="Semail" name="Semail" aria-describedby="emailHelp" onChange={onChange} />
            <div id="emailHelp" className="form-text">We'll never share your email with anyone else.</div>
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password</label>
            <input type="password" className="form-control" id="Spassword" name="Spassword"  onChange={onChange} minLength={5} required />
          </div>
          <div className="mb-3 form-check">
            <input type="checkbox" className="form-check-input" id="exampleCheck1" required />
            <label className="form-check-label" htmlFor="exampleCheck1">Check me out</label>
          </div>
          <button type="submit" className="btn btn-primary">Register</button>
        </form>
      </div>

    </>
  )
}

export default Signup