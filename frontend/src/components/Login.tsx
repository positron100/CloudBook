import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Field } from "@/components/ui";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

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
      toast.success("Welcome back");
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
    <AuthLayout
      pitch="Pick up where you left off."
      pitchSub="Your notes, kept on the cloud and ready on every device — a calm place to collect your thoughts."
    >
      <h2 className="auth__title">Log in</h2>
      <form className="auth__form" aria-label="Log in" onSubmit={handleSubmit}>
        <Field
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          value={credentials.email}
          onChange={onChange}
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
        New to CloudBook? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
