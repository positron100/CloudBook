import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Field, Surface } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import "./auth.css";

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "", cPassword: "" });
  const [submitting, setSubmitting] = useState(false);
  const mismatch = form.cPassword.length > 0 && form.password !== form.cPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.cPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      // Backend contract: { name, email, password } — cPassword is client-only.
      await signup(form.name, form.email, form.password);
      toast.success("Account created — log in to continue");
      navigate("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setSubmitting(false);
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <Reveal as="div" onView={false} className="auth">
      <Surface level={4} as="section" className="auth__card">
        <h1 className="auth__title">Create your account</h1>
        <form className="auth__form" aria-label="Sign up" onSubmit={handleSubmit}>
          <Field
            label="Name"
            name="name"
            autoComplete="name"
            minLength={3}
            value={form.name}
            onChange={onChange}
            required
          />
          <Field
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={onChange}
            hint="We'll never share your email with anyone else."
            required
          />
          <Field
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={5}
            value={form.password}
            onChange={onChange}
            required
          />
          <Field
            label="Confirm password"
            type="password"
            name="cPassword"
            autoComplete="new-password"
            value={form.cPassword}
            onChange={onChange}
            error={mismatch ? "Passwords don't match" : undefined}
            required
          />
          <Button type="submit" variant="primary" block loading={submitting} disabled={mismatch}>
            {submitting ? "Creating account…" : "Sign up"}
          </Button>
        </form>
        <p className="auth__alt">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </Surface>
    </Reveal>
  );
}
