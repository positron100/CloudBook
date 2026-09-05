/**
 * Shared frontend <-> backend contract types.
 *
 * These describe the CloudBook Backend API **as it currently behaves** (Express +
 * Mongoose, deployed on Render). Response shapes are deliberately inconsistent
 * between endpoints today — that is documented here, not fixed. Any normalization
 * happens in a later phase and this file changes with it.
 */

// ---------------------------------------------------------------------------
// Entities (Mongoose documents, as serialized to JSON)
// ---------------------------------------------------------------------------

export interface User {
  _id: string;
  name: string;
  email: string;
  /** ISO date string. Mongoose `date` field, default Date.now. */
  date: string;
  __v?: number;
  // `password` is stripped by `.select('-password')` on /getuser and never sent.
}

export interface Note {
  _id: string;
  /** Owner user id (ObjectId string). Not populated. */
  user: string;
  title: string;
  description: string;
  /** Defaults to "General" server-side when omitted. */
  tag: string;
  /** ISO date string. */
  date: string;
  __v?: number;
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AddNoteRequest {
  title: string;
  description: string;
  tag?: string;
}

export interface UpdateNoteRequest {
  title?: string;
  description?: string;
  tag?: string;
}

// ---------------------------------------------------------------------------
// Responses (current, un-normalized)
// ---------------------------------------------------------------------------

/** POST /api/auth/createuser and POST /api/auth/login */
export interface AuthResponse {
  status: boolean;
  authToken?: string;
  /** Present on failure. Either a string or express-validator's array. */
  error?: string | ValidationErrorItem[];
}

export interface ValidationErrorItem {
  type?: string;
  msg: string;
  path?: string;
  location?: string;
  value?: unknown;
}

/** GET /api/auth/getuser -> the User document directly (no wrapper). */
export type GetUserResponse = User;

/** GET /api/notes/fetchallnotes -> a bare array (no wrapper). */
export type FetchAllNotesResponse = Note[];

/** POST /api/notes/addnote -> the created Note directly (flat, no wrapper). */
export type AddNoteResponse = Note;

/** PUT /api/notes/updatenote/:id -> wrapped in { note }. */
export interface UpdateNoteResponse {
  note: Note;
}

/** DELETE /api/notes/deletenote/:id -> { Success, note }. */
export interface DeleteNoteResponse {
  Success: string;
  note: Note;
}

// ---------------------------------------------------------------------------
// Endpoint map (for reference / typed client)
// ---------------------------------------------------------------------------

export const API_ROUTES = {
  signup: "/api/auth/createuser",
  login: "/api/auth/login",
  getUser: "/api/auth/getuser",
  fetchAllNotes: "/api/notes/fetchallnotes",
  addNote: "/api/notes/addnote",
  updateNote: (id: string) => `/api/notes/updatenote/${id}`,
  deleteNote: (id: string) => `/api/notes/deletenote/${id}`,
} as const;

/** Header name the backend expects the JWT in (not `Authorization`). */
export const AUTH_HEADER = "auth-token" as const;
