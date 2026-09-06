import { describe, expect, it } from "vitest";
import { introDestinations, resolveIntroDestination } from "./introDestinations";

describe("resolveIntroDestination", () => {
  it("routes authenticated Home to the notebook, anonymous Home to auth", () => {
    expect(resolveIntroDestination("/", true)).toBe("notes");
    expect(resolveIntroDestination("/", false)).toBe("auth");
  });

  it("routes the auth paths to auth regardless of state", () => {
    for (const p of ["/login", "/register", "/signup"]) {
      expect(resolveIntroDestination(p, false)).toBe("auth");
      expect(resolveIntroDestination(p, true)).toBe("auth");
    }
  });

  it("routes /about to the Contact letter", () => {
    expect(resolveIntroDestination("/about", true)).toBe("contact");
    expect(resolveIntroDestination("/about", false)).toBe("contact");
  });

  it("routes /profile to profile when authed, auth when not", () => {
    expect(resolveIntroDestination("/profile", true)).toBe("profile");
    expect(resolveIntroDestination("/profile", false)).toBe("auth");
  });

  it("tolerates trailing slashes and unknown paths without throwing", () => {
    expect(resolveIntroDestination("/about/", true)).toBe("contact");
    expect(resolveIntroDestination("/whatever", true)).toBe("notes");
    expect(resolveIntroDestination("/whatever", false)).toBe("auth");
  });

  it("every destination has a target selector", () => {
    for (const key of ["notes", "auth", "contact", "profile"] as const) {
      expect(introDestinations[key].selector).toMatch(/\S/);
    }
  });
});
