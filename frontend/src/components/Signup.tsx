import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { ShowAlert } from "@/types/alert";

const Signup = ({ showAlert }: { showAlert: ShowAlert }) => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [credentials, setCredentials] = useState({ name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signup(credentials.name, credentials.email, credentials.password);
      showAlert("Your account has been created", "success");
      navigate("/login");
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Invalid credentials", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  return (
    <div className="container my-3">
      <h2>Register to use CloudBook</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3 my-3">
          <label htmlFor="name" className="form-label">
            Name
          </label>
          <input
            type="text"
            className="form-control"
            id="name"
            name="name"
            autoComplete="name"
            minLength={3}
            onChange={onChange}
            value={credentials.name}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">
            Email address
          </label>
          <input
            type="email"
            className="form-control"
            id="email"
            name="email"
            autoComplete="email"
            aria-describedby="emailHelp"
            onChange={onChange}
            value={credentials.email}
            required
          />
          <div id="emailHelp" className="form-text">
            We'll never share your email with anyone else.
          </div>
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            type="password"
            className="form-control"
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={5}
            onChange={onChange}
            value={credentials.password}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Creating account…" : "Register"}
        </button>
      </form>
    </div>
  );
};

export default Signup;
