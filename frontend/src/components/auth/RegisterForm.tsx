import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Field } from "@/components/ui";
import { Magnetic } from "@/components/motion";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import "./AuthForm.css";

export function RegisterForm() {
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
      toast.success("Your desk is ready — log in to open it.", { title: "Account created" });
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
    <div className="auth-form">
      <h1 className="auth-form__title">Create account</h1>
      <form className="auth-form__body" aria-label="Sign up" onSubmit={handleSubmit}>
        <Field
          label="Name"
          name="name"
          icon="user"
          autoComplete="name"
          minLength={3}
          value={form.name}
          onChange={onChange}
          lift
          previewText="Ada Lovelace"
          required
        />
        <Field
          label="Email address"
          type="email"
          name="email"
          icon="mail"
          autoComplete="email"
          value={form.email}
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
          autoComplete="new-password"
          minLength={5}
          value={form.password}
          onChange={onChange}
          lift
          required
        />
        <Field
          label="Confirm password"
          type="password"
          name="cPassword"
          iconStart="lock"
          autoComplete="new-password"
          value={form.cPassword}
          onChange={onChange}
          error={mismatch ? "Passwords don't match" : undefined}
          lift
          required
        />
        <Magnetic strength={6} className="auth-form__cta">
          <Button type="submit" variant="primary" block lift loading={submitting} disabled={mismatch}>
            {submitting ? "Creating account…" : "Sign up"}
          </Button>
        </Magnetic>
      </form>
    </div>
  );
}
