import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { ShowAlert } from "@/types/alert";

const Signup = ({ showAlert }: { showAlert: ShowAlert }) => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", cPassword: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.cPassword) {
      showAlert("Password Doesn't Match", "danger");
      return;
    }
    setSubmitting(true);
    try {
      // Backend contract: { name, email, password } — cPassword is client-only.
      await signup(form.name, form.email, form.password);
      showAlert("Account Created Successfully", "success");
      navigate("/login");
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Invalid credentials", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="container my-3">
      <h1 className="h3">Create an account</h1>
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
            value={form.name}
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
            value={form.email}
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
            value={form.password}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="cPassword" className="form-label">
            Confirm Password
          </label>
          <input
            type="password"
            className="form-control"
            id="cPassword"
            name="cPassword"
            autoComplete="new-password"
            onChange={onChange}
            value={form.cPassword}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Creating account…" : "Sign-up"}
        </button>
      </form>
      <p className="mt-3">
        Already have an account? <Link to="/login">Click to login</Link>
      </p>
    </div>
  );
};

export default Signup;
