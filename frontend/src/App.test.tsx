import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Note, User } from "@shared/types";
import App from "./App";

vi.mock("@/lib/api");
import * as api from "@/lib/api";

const mockUser: User = { _id: "u1", name: "Mukul", email: "m@example.com", date: "2024-01-01" };
const note = (over: Partial<Note> = {}): Note => ({
  _id: "n1",
  user: "u1",
  title: "First note",
  description: "hello world",
  tag: "General",
  date: "2024-01-01",
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  vi.mocked(api.getUser).mockResolvedValue(mockUser);
  vi.mocked(api.fetchNotes).mockResolvedValue([]);
});

afterEach(() => localStorage.clear());

describe("auth gating", () => {
  it("redirects an anonymous visitor from / to the login page", async () => {
    window.history.pushState({}, "", "/");
    render(<App />);
    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
  });

  it("renders no footer landmark on the public shell", async () => {
    window.history.pushState({}, "", "/about");
    render(<App />);
    await screen.findByRole("heading", { name: /calm place to keep your notes/i });
    expect(screen.queryByRole("contentinfo")).toBeNull();
  });

  it("accepts a session stored under the legacy 'Token' key and promotes it", async () => {
    localStorage.setItem("Token", "legacy.jwt");
    vi.mocked(api.fetchNotes).mockResolvedValue([note()]);
    window.history.pushState({}, "", "/");
    render(<App />);
    expect(await screen.findByText("First note")).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem("token")).toBe("legacy.jwt"));
    expect(localStorage.getItem("Token")).toBeNull();
  });
});

describe("login flow", () => {
  it("logs in, stores the token under 'token', lands on notes", async () => {
    vi.mocked(api.login).mockResolvedValue("new.jwt");
    vi.mocked(api.fetchNotes).mockResolvedValue([note()]);
    window.history.pushState({}, "", "/login");
    render(<App />);

    const loginForm = within(screen.getByRole("form", { name: /log in/i }));
    await userEvent.type(loginForm.getByLabelText(/email address/i), "m@example.com");
    await userEvent.type(loginForm.getByLabelText(/^password$/i), "secret");
    await userEvent.click(loginForm.getByRole("button", { name: /^log in$/i }));

    await waitFor(() => expect(localStorage.getItem("token")).toBe("new.jwt"));
    expect(localStorage.getItem("Token")).toBeNull();
    expect(api.login).toHaveBeenCalledWith({ email: "m@example.com", password: "secret" });
    expect(await screen.findByRole("heading", { name: /your desk/i })).toBeInTheDocument();
  });

  it("surfaces a server error and stores no token", async () => {
    vi.mocked(api.login).mockRejectedValue(new Error("please try to login with correct credentials"));
    window.history.pushState({}, "", "/login");
    render(<App />);

    const loginForm = within(screen.getByRole("form", { name: /log in/i }));
    await userEvent.type(loginForm.getByLabelText(/email address/i), "x@example.com");
    await userEvent.type(loginForm.getByLabelText(/^password$/i), "wrong");
    await userEvent.click(loginForm.getByRole("button", { name: /^log in$/i }));

    expect(await screen.findByText(/correct credentials/i)).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });
});

describe("routing", () => {
  it("redirects /signup to /register", async () => {
    window.history.pushState({}, "", "/signup");
    render(<App />);
    expect(await screen.findByRole("heading", { name: /create account/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/register");
  });
});

describe("notes CRUD", () => {
  beforeEach(() => {
    localStorage.setItem("token", "valid.jwt");
    window.history.pushState({}, "", "/");
  });

  it("adds a note", async () => {
    vi.mocked(api.addNote).mockResolvedValue(note({ _id: "n2", title: "Groceries", description: "milk eggs" }));
    render(<App />);
    await screen.findByRole("heading", { name: /your desk is clear/i });

    await userEvent.type(screen.getByLabelText(/^title$/i), "Groceries");
    await userEvent.type(screen.getByLabelText(/^note$/i), "milk eggs");
    await userEvent.click(screen.getByRole("button", { name: /tear out/i }));

    expect(api.addNote).toHaveBeenCalledWith({ title: "Groceries", description: "milk eggs", tag: "General" });
    expect(await screen.findByText("Groceries")).toBeInTheDocument();
  });

  it("deletes a note", async () => {
    const existing = note({ title: "Delete me" });
    vi.mocked(api.fetchNotes).mockResolvedValue([existing]);
    vi.mocked(api.deleteNote).mockResolvedValue(existing);
    render(<App />);

    const card = (await screen.findByText("Delete me")).closest(".note-card") as HTMLElement;
    await userEvent.click(within(card).getByRole("button", { name: /delete note/i }));

    await waitFor(() => expect(screen.queryByText("Delete me")).not.toBeInTheDocument());
    expect(api.deleteNote).toHaveBeenCalledWith("n1");
  });
});

describe("signup flow", () => {
  it("blocks submit when passwords don't match", async () => {
    window.history.pushState({}, "", "/register");
    render(<App />);

    const form = within(screen.getByRole("form", { name: /sign up/i }));
    await userEvent.type(form.getByLabelText(/^name$/i), "New User");
    await userEvent.type(form.getByLabelText(/email address/i), "new@example.com");
    await userEvent.type(form.getByLabelText(/^password$/i), "secret");
    await userEvent.type(form.getByLabelText(/confirm password/i), "different");
    await userEvent.click(form.getByRole("button", { name: /^sign up$/i }));

    expect(await screen.findByText(/don't match/i)).toBeInTheDocument();
    expect(api.signup).not.toHaveBeenCalled();
  });

  it("creates an account (name/email/password only) and redirects to login", async () => {
    vi.mocked(api.signup).mockResolvedValue("signup.jwt");
    window.history.pushState({}, "", "/register");
    render(<App />);

    const form = within(screen.getByRole("form", { name: /sign up/i }));
    await userEvent.type(form.getByLabelText(/^name$/i), "New User");
    await userEvent.type(form.getByLabelText(/email address/i), "new@example.com");
    await userEvent.type(form.getByLabelText(/^password$/i), "secret");
    await userEvent.type(form.getByLabelText(/confirm password/i), "secret");
    await userEvent.click(form.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() =>
      expect(api.signup).toHaveBeenCalledWith({
        name: "New User",
        email: "new@example.com",
        password: "secret",
      }),
    );
    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });
});

describe("profile", () => {
  it("shows the authenticated user's details", async () => {
    localStorage.setItem("token", "valid.jwt");
    window.history.pushState({}, "", "/profile");
    render(<App />);
    expect(await screen.findByRole("heading", { name: /^profile$/i })).toBeInTheDocument();
    expect(screen.getByText("m@example.com")).toBeInTheDocument();
  });
});
