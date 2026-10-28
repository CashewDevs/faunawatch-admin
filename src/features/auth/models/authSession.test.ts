import { describe, expect, it } from "vitest";
import {
  AuthFailure,
  getAdminDisplayName,
  getAuthErrorKind,
  getSessionStatus,
  type SessionSnapshot,
} from "./authSession";

const noNames = { fullName: null, username: null, displayName: null };

describe("getAdminDisplayName", () => {
  it("prefers the full name", () => {
    expect(
      getAdminDisplayName(
        { fullName: "Maria Santos", username: "msantos", displayName: "M" },
        "maria@example.org",
      ),
    ).toBe("Maria Santos");
  });

  it("falls back to username, then the legacy display name", () => {
    expect(
      getAdminDisplayName(
        { ...noNames, username: "msantos", displayName: "M" },
        null,
      ),
    ).toBe("msantos");
    expect(getAdminDisplayName({ ...noNames, displayName: "M" }, null)).toBe(
      "M",
    );
  });

  it("ignores blank values", () => {
    expect(
      getAdminDisplayName(
        { fullName: "  ", username: "", displayName: null },
        "admin@example.org",
      ),
    ).toBe("admin");
  });

  it("returns null when there is nothing to show", () => {
    expect(getAdminDisplayName(noNames, null)).toBeNull();
  });
});

describe("getAuthErrorKind", () => {
  it("reads the kind from an AuthFailure", () => {
    expect(getAuthErrorKind(new AuthFailure("notAdmin"))).toBe("notAdmin");
  });

  it("treats any other error as unknown", () => {
    expect(getAuthErrorKind(new Error("boom"))).toBe("unknown");
  });
});

describe("getSessionStatus", () => {
  const user = { id: "user-1", email: null };
  const admin = { id: "user-1", displayName: "Maria" };
  const base: SessionSnapshot = {
    user,
    source: "restored",
    isChecking: false,
    isCheckFailed: false,
    profile: admin,
  };

  it("is loading until the saved session has been read", () => {
    expect(getSessionStatus({ ...base, user: undefined })).toBe("loading");
  });

  it("is signed out without a session", () => {
    expect(getSessionStatus({ ...base, user: null })).toBe("signedOut");
  });

  it("is loading while a restored session is checked", () => {
    expect(getSessionStatus({ ...base, isChecking: true })).toBe("loading");
  });

  it("is verifying while a new sign-in is checked", () => {
    expect(
      getSessionStatus({ ...base, source: "changed", isChecking: true }),
    ).toBe("verifying");
  });

  it("is signed in only for a confirmed admin", () => {
    expect(getSessionStatus(base)).toBe("signedIn");
    expect(getSessionStatus({ ...base, profile: null })).toBe("signedOut");
  });

  it("fails closed when the admin check fails", () => {
    expect(getSessionStatus({ ...base, isCheckFailed: true })).toBe(
      "signedOut",
    );
  });
});
