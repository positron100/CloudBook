import { useState, type ChangeEvent, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Field } from "@/components/ui";
import { Magnetic } from "@/components/motion";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import "./AuthForm.css";

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const toast = useToast();
  const [creds, setCreds] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(creds.email, creds.password);
      toast.success("Welcome back");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) =>
    setCreds({ ...creds, [e.target.name]: e.target.value });

  return (
    <div className="auth-form">
      <h1 className="auth-form__title">Log in</h1>
      <form className="auth-form__body" aria-label="Log in" onSubmit={handleSubmit}>
        <Field
          label="Email address"
          type="email"
          name="email"
          icon="mail"
          autoComplete="email"
          value={creds.email}
          onChange={onChange}
          lift
          previewText="you@example.com"
          required
        />
        <Field
          label="Password"
          type="password"
          name="password"
          iconStart="lock"
          autoComplete="current-password"
          value={creds.password}
          onChange={onChange}
          lift
          required
        />
        <Magnetic strength={6} className="auth-form__cta">
          <Button type="submit" variant="primary" block lift loading={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </Button>
        </Magnetic>
      </form>
    </div>
  );
}
