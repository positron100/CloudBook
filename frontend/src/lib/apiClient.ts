import { AUTH_HEADER } from "@shared/types";
import { getToken } from "./auth";

const BASE_URL = import.meta.env.VITE_API_URL;

if (!BASE_URL) {
  // Fail loudly in dev; a missing base URL otherwise surfaces as confusing
  // "fetch to /api/..." 404s against the Vite dev server.
  throw new Error("VITE_API_URL is not set. Copy frontend/.env.example to frontend/.env");
}

export class ApiError extends Error {
  readonly status: number;
  /** Parsed error body when the server sent one (JSON object, array, or string). */
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** JSON-serializable request body. */
  body?: unknown;
  /** Attach the current auth token as the `auth-token` header. */
  auth?: boolean;
  signal?: AbortSignal;
}

/**
 * The single fetch entry point for the app. Every backend call goes through
 * here so base URL, auth header, JSON encoding, and error handling live in one
 * place.
 *
 * The backend currently returns errors as either JSON or plain text depending
 * on the endpoint, so we sniff the content type and normalize both into an
 * `ApiError`. Callers get a parsed success body or a thrown `ApiError` — never
 * a raw `Response`.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = false, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers[AUTH_HEADER] = token;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (cause) {
    // Network failure, DNS, CORS preflight rejection, offline, aborted.
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(0, "Network error — could not reach the server.", cause);
  }

  const payload = await parseBody(res);

  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(payload, res.status), payload);
  }

  return payload as T;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function errorMessage(payload: unknown, status: number): string {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.error === "string") return obj.error;
    if (Array.isArray(obj.error) && obj.error[0] && typeof obj.error[0] === "object") {
      const first = obj.error[0] as Record<string, unknown>;
      if (typeof first.msg === "string") return first.msg;
    }
  }
  return `Request failed (${status})`;
}
