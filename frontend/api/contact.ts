import { handleContact, type ContactPayload } from "./_contact.js";

/**
 * The deployed letter endpoint. Same shape as the Portfolio project's
 * `api/contact.ts`: written against the Web `Request`/`Response` API so it
 * runs as-is on Vercel (which is what this Vite SPA's `api/` directory
 * deploys to with no configuration). All the actual work lives in
 * `_contact.ts`, which has no host dependencies at all.
 */
export const config = { runtime: "edge" };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed." }, { status: 405 });
  }

  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return Response.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  // Behind a proxy the socket address is the proxy's, so the forwarded
  // header is the visitor. First entry only: the rest can be spoofed by the
  // client, and the last is the proxy itself.
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const clientKey = forwarded.split(",")[0].trim() || "unknown";

  const result = await handleContact(payload, process.env, clientKey);
  return Response.json(result.body, { status: result.status });
}
