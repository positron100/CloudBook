import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Field } from "@/components/ui";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

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
    <AuthLayout
      pitch="Start your cloud desk."
      pitchSub="One account keeps every note in sync — write on your laptop, read on your phone."
    >
      <h2 className="auth__title">Create your account</h2>
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
    </AuthLayout>
  );
}
