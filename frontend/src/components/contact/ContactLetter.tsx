import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, m, useAnimationControls } from "framer-motion";
import { Icon } from "@/components/ui";
import { Magnetic } from "@/components/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTypingPreview } from "@/hooks/useTypingPreview";
import { ease, spring } from "@/utils/motion";
import "./ContactLetter.css";

const CONTACT_EMAIL = "hello@cloudbook.app";
const REPO_URL = "https://github.com/positron100/CloudBook";

/**
 * The Contact letter, choreographed after the ContactForm in the Portfolio
 * project: one DOM element that is the paper, the folding envelope and the
 * confirmation in turn, driven by a single `runDelivery` chain so nothing
 * starts before the stage before it lands, and every stage is reversible.
 *
 *   writing   → the letter, editable on ruled paper
 *   sealing   → content settles out, the sheet folds to envelope size, the
 *               flap rotates shut, the wax seal presses on
 *   flying    → the same element arcs away and shrinks off the desk
 *   delivered → it resolves into the confirmation
 *   unsealing → "Write another" runs the seal backwards to a blank letter
 *
 * No backend — "Seal & Send" opens the visitor's mail client with the letter
 * composed. Reduced motion keeps the plain flow: compose, confirm, done.
 */
type Phase = "writing" | "sealing" | "flying" | "delivered" | "unsealing";

/** Stage lengths (ms) — the sequence's only clock. */
const STAGE = { settle: 240, fold: 520, flap: 400, seal: 280, fly: 820 } as const;
/** Folded proportions; width is clamped to the letter's own width at run time. */
const ENVELOPE = { width: 360, height: 216 } as const;
/** Ruled paper: `line` is both the gradient period and the textarea line-height
 *  — identical to the notebook's `--rule` so the stationery matches. */
const RULE = { line: 26, offset: 4, rows: 4 } as const;

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

interface Values {
  name: string;
  email: string;
  message: string;
}
type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = { name: "", email: "", message: "" };

function validate(v: Values): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = "A name, however short.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "An address I can reply to.";
  if (v.message.trim().length < 4) e.message = "Say a little more.";
  return e;
}

export function ContactLetter() {
  const reduce = useReducedMotion();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [phase, setPhase] = useState<Phase>("writing");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reservedHeight, setReservedHeight] = useState<number | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const card = useAnimationControls();
  const inFlight = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const written = useMemo(() => 3 - Object.keys(validate(values)).length, [values]);
  const sealed = phase !== "writing";

  const set = (field: keyof Values, value: string) => {
    setValues((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
    setFailed(false);
  };

  const compose = () => {
    const subject = encodeURIComponent(`CloudBook — ${values.name || "a note"}`);
    const body = encodeURIComponent(`${values.message}\n\nKind regards,\n${values.name}\n${values.email}`);
    return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  /** Hands the composed letter to the OS mail client. Never throws — a blocked
   *  handler just means the visitor uses the address in the margin. */
  const openMail = (): boolean => {
    try {
      window.location.href = compose();
      return true;
    } catch {
      return false;
    }
  };

  async function runDelivery() {
    const el = cardRef.current;
    if (!el || reduce) {
      openMail();
      if (alive.current) {
        setValues(EMPTY);
        setPhase("delivered");
      }
      return;
    }

    const height = el.offsetHeight;
    const width = el.offsetWidth;
    const envW = Math.min(ENVELOPE.width, width);

    // Pin the card to its current size so the first fold frame equals the last
    // letter frame.
    card.set({ height, width });
    setReservedHeight(height);
    setPhase("sealing");

    await sleep(STAGE.settle);
    if (!alive.current) return;
    await card.start(
      { height: ENVELOPE.height, width: envW },
      { duration: STAGE.fold / 1000, ease: ease.standard },
    );
    await sleep(STAGE.flap + STAGE.seal);
    if (!alive.current) return;

    // The "send" is the mail client opening. If that fails, unwind.
    if (!openMail()) {
      setPhase("writing");
      await card.start({ height, width }, { duration: STAGE.fold / 1000, ease: ease.standard });
      if (!alive.current) return;
      card.set({ height: "auto", width: "auto" });
      setReservedHeight(null);
      setFailed(true);
      return;
    }

    setPhase("flying");
    await card.start({
      x: [0, 16, 88],
      y: [0, 12, -220],
      rotate: [0, 3, -15],
      scale: [1, 1.02, 0.34],
      opacity: [1, 1, 0],
      transition: { duration: STAGE.fly / 1000, ease: [0.5, 0, 0.3, 1], times: [0, 0.18, 1] },
    });
    if (!alive.current) return;

    card.set({ x: 0, y: 0, rotate: 0, scale: 1, opacity: 0, height: "auto", width: "auto" });
    setValues(EMPTY);
    setPhase("delivered");
    setReservedHeight(null);
    await card.start({ opacity: 1 }, { duration: 0.24, ease: ease.standard });
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    inFlight.current = true;
    setSending(true);
    try {
      await runDelivery();
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  async function writeAnother() {
    if (inFlight.current) return;
    const el = cardRef.current;
    setFailed(false);
    setErrors({});
    if (!el || reduce) {
      setPhase("writing");
      return;
    }
    inFlight.current = true;
    try {
      const height = el.offsetHeight;
      const width = el.offsetWidth;
      card.set({ height, width });
      setReservedHeight(height);
      setPhase("unsealing");
      await sleep(STAGE.settle);
      if (!alive.current) return;
      await card.start(
        { height: ENVELOPE.height, width: Math.min(ENVELOPE.width, width) },
        { duration: STAGE.fold / 1000, ease: ease.standard },
      );
      await sleep(STAGE.seal + STAGE.flap);
      if (!alive.current) return;
      setPhase("writing");
      await card.start(
        { height: "auto", width: "auto" },
        { duration: STAGE.fold / 1000, ease: ease.standard },
      );
      if (!alive.current) return;
      setReservedHeight(null);
    } finally {
      inFlight.current = false;
    }
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard?.writeText(CONTACT_EMAIL);
    } catch {
      /* mailto still works */
    }
  };

  return (
    <div className="contact-letter" style={{ minHeight: reservedHeight ?? undefined }}>
      <FlightTrail active={phase === "flying"} />

      <m.div
        ref={cardRef}
        animate={card}
        style={{ perspective: 1000, transformOrigin: "50% 58%" }}
        className="contact-letter__card"
      >
        <span className="contact-letter__margin" aria-hidden="true" />

        <AnimatePresence mode="wait" initial={false}>
          {phase === "delivered" ? (
            <Delivered key="delivered" name="" onWriteAnother={writeAnother} />
          ) : (
            <m.div
              key="letter"
              className="contact-letter__body"
              animate={{ opacity: sealed ? 0 : 1, y: sealed ? -8 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: STAGE.settle / 1000, ease: ease.standard }}
              aria-hidden={sealed || undefined}
              data-sealed={sealed || undefined}
            >
              <form noValidate onSubmit={onSubmit} aria-label="Send a message">
                <div className="contact-letter__head">
                  <p className="contact-letter__salutation">Dear CloudBook,</p>
                  <Stamp written={written} />
                </div>

                <div className="contact-letter__lines">
                  <WrittenLine
                    id="cl-name"
                    lead="My name is"
                    value={values.name}
                    error={errors.name}
                    onChange={(v) => set("name", v)}
                    autoComplete="name"
                    previewText="Ada Lovelace"
                  />
                  <WrittenLine
                    id="cl-email"
                    lead="and you can reach me at"
                    type="email"
                    value={values.email}
                    error={errors.email}
                    onChange={(v) => set("email", v)}
                    autoComplete="email"
                    previewText="you@example.com"
                  />
                  <WrittenLine
                    id="cl-message"
                    lead="I wanted to say"
                    as="textarea"
                    value={values.message}
                    error={errors.message}
                    onChange={(v) => set("message", v)}
                    previewText="A question, a bug, an idea for the desk…"
                  />
                </div>

                <div className="contact-letter__close">
                  <p className="contact-letter__regards">
                    {written === 3 ? "Ready to send." : "Kind regards,"}
                  </p>
                  <Magnetic>
                    <m.button
                      type="submit"
                      className="contact-letter__send"
                      data-ready={written === 3 || undefined}
                      disabled={sending}
                      whileHover={sending || reduce ? undefined : { y: -2 }}
                      whileTap={reduce ? undefined : { scale: 0.96 }}
                      transition={spring.snappy}
                    >
                      <Icon name="mail" size={16} />
                      {sending ? "Sealing…" : "Seal & Send"}
                    </m.button>
                  </Magnetic>
                </div>
              </form>

              <div role="status" aria-live="polite" className="contact-letter__status">
                <AnimatePresence mode="wait">
                  {failed && (
                    <m.p
                      key="err"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="contact-letter__error"
                    >
                      <Icon name="alert-circle" size={13} />
                      Couldn't open your mail app —{" "}
                      <a href={`mailto:${CONTACT_EMAIL}`}>email directly</a>.
                    </m.p>
                  )}
                </AnimatePresence>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        <Envelope phase={phase} />
      </m.div>

      <div className="contact-letter__aside">
        <button type="button" className="contact-letter__link" onClick={copyEmail}>
          <Icon name="mail" size={15} />
          <span>{CONTACT_EMAIL}</span>
          <Icon name="copy" size={12} className="contact-letter__link-hint" />
        </button>
        <a className="contact-letter__link" href={REPO_URL} target="_blank" rel="noreferrer noopener">
          <Icon name="github" size={15} />
          <span>positron100/CloudBook</span>
        </a>
      </div>
    </div>
  );
}

/* --- The folding envelope, drawn inside the same card -------------------- */
function Envelope({ phase }: { phase: Phase }) {
  const sealing = phase === "sealing" || phase === "flying";
  const unsealing = phase === "unsealing";
  const shown = sealing || unsealing;
  const t = (ms: number) => ms / 1000;
  const lead = t(STAGE.settle);

  const sides = unsealing
    ? { to: [1, 0.14], delay: lead + t(STAGE.fold + STAGE.seal), duration: t(STAGE.flap) }
    : { to: shown ? 1 : 0.14, delay: shown ? lead : 0, duration: t(STAGE.fold) };
  const flap = unsealing
    ? { to: [0, -162], delay: lead + t(STAGE.fold + STAGE.seal), duration: t(STAGE.flap) }
    : { to: shown ? 0 : -162, delay: shown ? lead + t(STAGE.fold) : 0, duration: t(STAGE.flap) };
  const seal = unsealing
    ? { to: [1, 0], delay: lead + t(STAGE.fold) }
    : { to: shown ? 1 : 0, delay: shown ? lead + t(STAGE.fold + STAGE.flap) : 0 };

  return (
    <div className="contact-letter__envelope" aria-hidden="true" style={{ perspective: 1000 }}>
      <m.div
        initial={false}
        animate={{ opacity: shown ? 1 : 0 }}
        transition={{ duration: 0.22, delay: sealing ? lead : 0 }}
        className="contact-letter__env-inner"
      >
        {[0, 1].map((side) => (
          <m.div
            key={side}
            initial={false}
            animate={{ scaleX: sides.to }}
            transition={{ duration: sides.duration, delay: sides.delay, ease: ease.standard }}
            className={`contact-letter__env-side contact-letter__env-side--${side}`}
          />
        ))}
        <m.div
          initial={false}
          animate={{ rotateX: flap.to }}
          transition={{ duration: flap.duration, delay: flap.delay, ease: ease.standard }}
          className="contact-letter__env-flap"
        />
        <m.div
          initial={false}
          animate={{ scale: seal.to }}
          transition={{ delay: seal.delay, type: "spring", stiffness: 520, damping: 14 }}
          className="contact-letter__env-seal"
        >
          CB
        </m.div>
      </m.div>
    </div>
  );
}

function FlightTrail({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="contact-letter__trail" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <m.span
          key={i}
          initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: [0, 0.7, 0], x: 52 + i * 8, y: -104 - i * 30, scale: 0.3 }}
          transition={{ duration: 0.68, delay: 0.1 + i * 0.07, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function Delivered({ onWriteAnother }: { name: string; onWriteAnother: () => void }) {
  const line = useTypingPreview("Your letter is composed — your mail app should be opening.", true, 34);
  return (
    <m.div
      className="contact-letter__delivered"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={spring.soft}
    >
      <svg width="48" height="48" viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <m.circle
          cx="26"
          cy="26"
          r="24"
          stroke="currentColor"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0.35 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.55, ease: ease.standard }}
        />
        <m.path
          d="M16 27l7 7 13-14"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.32, ease: ease.standard }}
        />
      </svg>
      <p className="contact-letter__delivered-title">Sealed</p>
      <p className="contact-letter__delivered-line" role="status" aria-live="polite">
        {line}
      </p>
      <button type="button" className="contact-letter__again" onClick={onWriteAnother}>
        Write another
      </button>
    </m.div>
  );
}

function Stamp({ written }: { written: number }) {
  const complete = written === 3;
  return (
    <m.span
      className="contact-letter__stamp"
      data-complete={complete || undefined}
      aria-hidden="true"
      initial={false}
      animate={{
        opacity: 0.3 + written * 0.23,
        scale: complete ? 1 : 0.94,
        rotate: complete ? 0 : -4,
      }}
      transition={spring.soft}
    >
      <Icon name="mail" size={18} />
    </m.span>
  );
}

interface WrittenLineProps {
  id: string;
  lead: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  type?: string;
  as?: "input" | "textarea";
  autoComplete?: string;
  previewText?: string;
}

function WrittenLine({
  id,
  lead,
  value,
  error,
  onChange,
  type = "text",
  as = "input",
  autoComplete,
  previewText,
}: WrittenLineProps) {
  const reduce = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const errorId = `${id}-error`;
  const previewActive = Boolean(previewText) && !value && !reduce && (focused || hovered);
  const preview = useTypingPreview(previewText ?? "", previewActive);
  const isBody = as === "textarea";

  const shared = {
    id,
    value,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    "aria-invalid": Boolean(error) || undefined,
    "aria-describedby": error ? errorId : undefined,
    autoComplete,
  };

  return (
    <div
      className="written-line"
      data-body={isBody || undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <label htmlFor={id} className="written-line__lead">
        {lead}
      </label>
      <div className="written-line__field">
        {isBody ? (
          <>
            <span
              className="written-line__wash"
              data-on={focused || Boolean(error) || undefined}
              data-error={Boolean(error) || undefined}
              aria-hidden="true"
            />
            <textarea
              {...shared}
              rows={RULE.rows}
              className="written-line__input written-line__input--body"
              style={{
                lineHeight: `${RULE.line}px`,
                backgroundPosition: `0 ${RULE.offset}px`,
              }}
            />
          </>
        ) : (
          <>
            <input {...shared} type={type} className="written-line__input" />
            <span className="written-line__rule" data-error={Boolean(error) || undefined} aria-hidden="true" />
            <m.span
              className="written-line__rule-focus"
              data-error={Boolean(error) || undefined}
              aria-hidden="true"
              initial={false}
              animate={{ scaleX: focused ? 1 : 0, opacity: focused ? 1 : 0 }}
              transition={{ duration: 0.28, ease: ease.standard }}
            />
          </>
        )}

        {preview && (
          <span className="written-line__preview" aria-hidden="true">
            {preview}
            <span className="written-line__caret" />
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {error && (
          <m.p
            id={errorId}
            className="written-line__error"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 6 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: ease.standard }}
          >
            <Icon name="alert-circle" size={13} />
            {error as ReactNode}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );
}
