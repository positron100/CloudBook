import React, { useState } from 'react'
import {useNavigate} from 'react-router-dom'

const Login = (props) => {
  const Navigate = useNavigate();
  const [credentials, setCredentials] = useState({email:"" , password:""})
  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch("https://cloud-book-backend.onrender.com/api/auth/login", {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json'
      },
      body: JSON.stringify({ email: credentials.email, password: credentials.password })
    });
    const json = await response.json();
    console.log(json)
    if(json.status)
    {
      //save the auth token and redirect
      localStorage.setItem('Token',json.authToken);
      props.showAlert('Logged in Successfully' , 'success')
      Navigate('/');
    }
    else{
      props.showAlert("Invalid details" , "danger")
      
    }
  }
  const onChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value })
  }
  return (
    <>
      <div className="container my-3 my-3">
        <h2>Login to continue where you left ... </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3 mt-3">
            <label htmlFor="email" className="form-label">Email address</label>
            <input type="email" className="form-control" id="email" name="email" aria-describedby="emailHelp" onChange={onChange} value={credentials.email}/>
            <div id="emailHelp" className="form-text">We'll never share your email with anyone else.</div>
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password</label>
            <input type="password" className="form-control" id="password" name="password" value={credentials.password} onChange={onChange} required />
          </div>
          <div className="mb-3 form-check">
            <input type="checkbox" className="form-check-input" id="exampleCheck1" required />
            <label className="form-check-label" htmlFor="exampleCheck1">Check me out</label>
          </div>
          <button type="submit" className="btn btn-primary" >Login</button>
        </form>
      </div>

    </>
  )
}

export default Login