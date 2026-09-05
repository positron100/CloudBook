import {
  API_ROUTES,
  type AddNoteRequest,
  type AuthResponse,
  type DeleteNoteResponse,
  type GetUserResponse,
  type LoginRequest,
  type Note,
  type SignupRequest,
  type UpdateNoteRequest,
  type UpdateNoteResponse,
} from "@shared/types";
import { apiRequest } from "./apiClient";

/**
 * Typed wrappers for the CloudBook Backend endpoints. Response shapes match the
 * backend as it behaves today (see @shared/types) — the inconsistencies are
 * absorbed here so callers get plain domain values.
 */

export async function signup(input: SignupRequest): Promise<string> {
  const res = await apiRequest<AuthResponse>(API_ROUTES.signup, { method: "POST", body: input });
  if (!res.status || !res.authToken) {
    throw new Error(typeof res.error === "string" ? res.error : "Signup failed");
  }
  return res.authToken;
}

export async function login(input: LoginRequest): Promise<string> {
  const res = await apiRequest<AuthResponse>(API_ROUTES.login, { method: "POST", body: input });
  if (!res.status || !res.authToken) {
    throw new Error(typeof res.error === "string" ? res.error : "Login failed");
  }
  return res.authToken;
}

export function getUser(signal?: AbortSignal): Promise<GetUserResponse> {
  return apiRequest<GetUserResponse>(API_ROUTES.getUser, { method: "POST", auth: true, signal });
}

export function fetchNotes(signal?: AbortSignal): Promise<Note[]> {
  return apiRequest<Note[]>(API_ROUTES.fetchAllNotes, { auth: true, signal });
}

export function addNote(input: AddNoteRequest): Promise<Note> {
  return apiRequest<Note>(API_ROUTES.addNote, { method: "POST", auth: true, body: input });
}

export async function updateNote(id: string, input: UpdateNoteRequest): Promise<Note> {
  const res = await apiRequest<UpdateNoteResponse>(API_ROUTES.updateNote(id), {
    method: "PUT",
    auth: true,
    body: input,
  });
  return res.note;
}

export async function deleteNote(id: string): Promise<Note> {
  const res = await apiRequest<DeleteNoteResponse>(API_ROUTES.deleteNote(id), {
    method: "DELETE",
    auth: true,
  });
  return res.note;
}
