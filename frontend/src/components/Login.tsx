import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Field, Surface } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import "./auth.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const toast = useToast();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(credentials.email, credentials.password);
      toast.success("Logged in");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) =>
    setCredentials({ ...credentials, [e.target.name]: e.target.value });

  return (
    <Reveal as="div" onView={false} className="auth">
      <Surface level={4} as="section" className="auth__card">
        <h1 className="auth__title">Log in to your notes</h1>
        <form className="auth__form" aria-label="Log in" onSubmit={handleSubmit}>
          <Field
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            value={credentials.email}
            onChange={onChange}
            hint="We'll never share your email with anyone else."
            required
          />
          <Field
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={credentials.password}
            onChange={onChange}
            required
          />
          <Button type="submit" variant="primary" block loading={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </Button>
        </form>
        <p className="auth__alt">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </Surface>
    </Reveal>
  );
}
