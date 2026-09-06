import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Field } from "@/components/ui";
import "./ContactLetter.css";

const CONTACT_EMAIL = "hello@cloudbook.app";

/**
 * The Contact surface as a physical letter: a closed envelope that opens —
 * flap folding back, the sheet rising out of the pocket and settling — to
 * reveal a short message form. Closing reverses the same mechanism. Transform
 * + clip-path only; under reduced motion the global backstop collapses it to
 * an instant state change and the letter simply is open or closed.
 *
 * No backend: "Send" composes a `mailto:` — the same mechanism the site had
 * before (none), kept deliberately simple.
 */
export function ContactLetter() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const stageRef = useRef<HTMLDivElement>(null);
  const openedOnce = useRef(false);

  // Open once when the letter scrolls into view — after that it's manual.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || openedOnce.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !openedOnce.current) {
          openedOnce.current = true;
          setOpen(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`CloudBook — ${form.name || "a note"}`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name}\n${form.email}`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="contact-letter">
      <div ref={stageRef} className="contact-letter__stage" data-open={open}>
        <div className="contact-letter__paper">
          <form className="contact-letter__form" aria-label="Send a message" onSubmit={onSubmit}>
            <p className="contact-letter__salutation">Dear CloudBook,</p>
            <Field
              label="Your name"
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Field
              label="Email to reach you"
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Field
              as="textarea"
              label="Message"
              name="message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
            />
            <Button type="submit" variant="primary" block lift>
              Send it
            </Button>
          </form>
        </div>

        <div className="contact-letter__pocket" aria-hidden="true" />
        <div className="contact-letter__flap" aria-hidden="true" />
      </div>

      <button
        type="button"
        className="contact-letter__toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Seal the letter" : "Open the letter"}
      </button>
    </div>
  );
}
