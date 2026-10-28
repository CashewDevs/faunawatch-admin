import { describe, expect, it } from "vitest";
import {
  AuthFailure,
  getAuthErrorKind,
  getSessionStatus,
  type SessionSnapshot,
} from "./authSession";

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
