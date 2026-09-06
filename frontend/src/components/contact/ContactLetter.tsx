import { useEffect, useRef, useState, type FormEvent } from "react";
import { m, type Variants } from "framer-motion";
import { Button, Field, Icon } from "@/components/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import "./ContactLetter.css";

const CONTACT_EMAIL = "hello@cloudbook.app";
const REPO_URL = "https://github.com/positron100/CloudBook";

const SPRING = { type: "spring", stiffness: 220, damping: 26, mass: 0.9 } as const;

const flapV: Variants = {
  closed: { rotateX: 0, transition: { ...SPRING, delay: 0.06 } },
  open: { rotateX: -172, transition: SPRING },
};
const sheetV: Variants = {
  closed: { y: "46%", rotate: -1.4, scale: 0.965, transition: { ...SPRING, delay: 0.04 } },
  open: { y: "0%", rotate: 0, scale: 1, transition: { ...SPRING, delay: 0.12 } },
};
const contentV: Variants = {
  closed: { opacity: 0, y: 8, transition: { duration: 0.16 } },
  open: { opacity: 1, y: 0, transition: { duration: 0.32, delay: 0.24 } },
};

/**
 * The Contact surface as a physical letter on the desk. A closed envelope
 * whose flap folds back while the sheet rises out of the pocket and settles —
 * revealing a short ruled note. Sealing runs the same mechanism in reverse.
 * Springs on the flap / sheet, opacity on the content; reduced motion skips
 * every transform and the letter simply is open or closed.
 *
 * No backend: "Send it" composes a `mailto:` — the site never had a server for
 * this and does not need one.
 */
export function ContactLetter() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [copied, setCopied] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const openedOnce = useRef(false);

  // Open once when it scrolls into view — after that it is manual.
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

  const copyEmail = async () => {
    try {
      await navigator.clipboard?.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the mailto still works */
    }
  };

  const anim = reduce ? undefined : open ? "open" : "closed";

  return (
    <div className="contact-letter">
      <m.div
        ref={stageRef}
        className="contact-letter__stage"
        data-open={open}
        initial={false}
        animate={anim}
      >
        <div className="contact-letter__well">
          <m.div className="contact-letter__sheet" variants={reduce ? undefined : sheetV}>
            <m.div className="contact-letter__content" variants={reduce ? undefined : contentV}>
              <p className="contact-letter__salutation">Dear CloudBook,</p>
                <form
                  className="contact-letter__form"
                  aria-label="Send a message"
                  onSubmit={onSubmit}
                >
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
            </m.div>
          </m.div>
        </div>

        <div className="contact-letter__envelope" aria-hidden="true">
          <span className="contact-letter__pocket" />
          <span className="contact-letter__lip" />
          <m.span className="contact-letter__flap" variants={reduce ? undefined : flapV} />
          <span className="contact-letter__seal" />
        </div>
      </m.div>

      <div className="contact-letter__aside">
        <button type="button" className="contact-letter__link" onClick={copyEmail}>
          <Icon name={copied ? "check" : "mail"} size={16} />
          <span>{copied ? "Copied" : CONTACT_EMAIL}</span>
          {!copied && <Icon name="copy" size={13} className="contact-letter__link-hint" />}
        </button>
        <a
          className="contact-letter__link"
          href={REPO_URL}
          target="_blank"
          rel="noreferrer noopener"
        >
          <Icon name="github" size={16} />
          <span>positron100/CloudBook</span>
        </a>
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
