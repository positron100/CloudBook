/**
 * The letter endpoint's actual work, kept free of any host framework — same
 * split as the Portfolio project's `api/_contact.ts`: this file has no
 * `req`/`res` shapes, so it runs as-is behind the Vercel handler in
 * `api/contact.ts` and behind the Vite dev-server middleware in
 * `vite.config.ts`.
 *
 * Nothing in this file is reachable from the browser bundle. The API key
 * lives only in the environment of whatever runs this.
 *
 * `_contact.ts` is prefixed with an underscore so Vercel treats it as a
 * private module rather than publishing it as its own route.
 */

export interface ContactPayload {
  name?: unknown;
  email?: unknown;
  message?: unknown;
}

export interface HandlerResult {
  status: number;
  body: { ok: boolean; error?: string };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Generous enough for a real letter, small enough to bound the payload. */
const LIMITS = { name: 120, email: 200, message: 5000 } as const;

const RATE_LIMIT = { windowMs: 60_000, max: 3 } as const;
const hits = new Map<string, number[]>();

/**
 * Best-effort rate limiting.
 *
 * Deliberately in-memory: a serverless deployment may run several instances
 * and recycle them, so this bounds a burst from one address against one
 * instance rather than guaranteeing a global cap. That is the right trade
 * here — it costs nothing, needs no external store, and stops the case that
 * actually happens (a script hammering the form).
 */
export function rateLimit(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // Keeps the map from growing without bound on a long-lived instance.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= RATE_LIMIT.windowMs)) hits.delete(k);
  }
  return true;
}

/**
 * Strips control characters and clamps length.
 *
 * The header-injection guard is the important part: a newline inside the
 * name would otherwise be interpolated into the Subject line, and a subject
 * containing a newline is how a header gets forged. Length caps stop a
 * multi-megabyte body being relayed.
 */
function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B-\x1F\x7F]/g, "")
    .trim()
    .slice(0, max);
}

function cleanHeader(value: unknown, max: number): string {
  return clean(value, max).replace(/[\r\n]+/g, " ");
}

export interface BuiltEmail {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
}

export function buildEmail(
  fields: { name: string; email: string; message: string },
  config: { from: string; to: string },
): BuiltEmail {
  const lines = [
    "A letter from your CloudBook desk",
    "",
    `Name: ${fields.name}`,
    `Email: ${fields.email}`,
    "",
    "Message:",
    "",
    fields.message,
  ];

  return {
    from: config.from,
    to: [config.to],
    // The writer's address cannot be the real `From`: sending as a domain you
    // do not control fails SPF/DKIM alignment and the message is rejected or
    // filed as spam. It goes here instead, so hitting reply answers them
    // directly.
    reply_to: fields.email,
    subject: `A letter from CloudBook — ${fields.name}`,
    text: lines.join("\n"),
  };
}

export interface Env {
  RESEND_API_KEY?: string;
  CONTACT_EMAIL?: string;
  EMAIL_FROM?: string;
}

export async function handleContact(
  payload: ContactPayload,
  env: Env,
  clientKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<HandlerResult> {
  const name = cleanHeader(payload.name, LIMITS.name);
  const email = cleanHeader(payload.email, LIMITS.email);
  const message = clean(payload.message, LIMITS.message);

  // Re-validated here, not trusted from the client: the browser check is a
  // convenience, this one is the rule.
  if (name.length < 2) return { status: 400, body: { ok: false, error: "A name is required." } };
  if (!EMAIL_PATTERN.test(email))
    return { status: 400, body: { ok: false, error: "A valid email address is required." } };
  if (message.length < 4)
    return { status: 400, body: { ok: false, error: "A message is required." } };

  if (!rateLimit(clientKey))
    return { status: 429, body: { ok: false, error: "Too many letters. Try again shortly." } };

  const apiKey = env.RESEND_API_KEY;
  const to = env.CONTACT_EMAIL;
  const from = env.EMAIL_FROM;
  if (!apiKey || !to || !from) {
    // Logged for the operator, never described to the caller: a public form
    // should not report which server-side variable is missing.
    console.error("[contact] missing RESEND_API_KEY, CONTACT_EMAIL or EMAIL_FROM");
    return { status: 500, body: { ok: false, error: "Unable to send right now." } };
  }

  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildEmail({ name, email, message }, { from, to })),
  });

  if (!response.ok) {
    console.error("[contact] provider rejected the message", response.status, await response.text());
    return { status: 502, body: { ok: false, error: "Unable to send right now." } };
  }

  return { status: 200, body: { ok: true } };
}
