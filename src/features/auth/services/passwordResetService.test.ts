import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthWeakPasswordError,
} from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSessionPersistence,
  setSessionPersistence,
} from "../../../core/services/authStorage";
import { PasswordResetFailure } from "../models/passwordReset";
import {
  clearRecoveryToken,
  readRecoveryToken,
  toPasswordResetFailure,
  updatePassword,
  verifyRecoveryToken,
} from "./passwordResetService";

const auth = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("../../../core/services/supabaseClient", () => ({
  supabase: { auth },
}));

vi.mock("../../../core/services/authStorage", () => ({
  setSessionPersistence: vi.fn(),
  clearSessionPersistence: vi.fn(),
}));

const expired = new AuthApiError("Token has expired", 403, "otp_expired");

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("toPasswordResetFailure", () => {
  it.each([
    ["a used or expired link", expired, "linkInvalid"],
    [
      "the same password",
      new AuthApiError("Same", 422, "same_password"),
      "samePassword",
    ],
    [
      "a weak password",
      new AuthWeakPasswordError("Weak", 422, ["length"]),
      "weakPassword",
    ],
    [
      "too many requests",
      new AuthApiError("Slow down", 429, "over_request_rate_limit"),
      "rateLimited",
    ],
    ["no connection", new AuthRetryableFetchError("Down", 0), "network"],
    [
      "another auth error",
      new AuthApiError("Nope", 400, "validation_failed"),
      "unknown",
    ],
    ["anything else", new Error("boom"), "unknown"],
  ])("translates %s", (_name, error, kind) => {
    expect(toPasswordResetFailure(error).kind).toBe(kind);
  });
});

describe("readRecoveryToken", () => {
  it("reads the token from after the #", () => {
    window.history.replaceState(null, "", "/reset-password#token_hash=abc123");

    expect(readRecoveryToken()).toBe("abc123");
  });

  it("still finds it when the address has a query string", () => {
    window.history.replaceState(
      null,
      "",
      "/reset-password?sb_flow_id=x#token_hash=abc123",
    );

    expect(readRecoveryToken()).toBe("abc123");
  });

  it.each([
    "/reset-password",
    "/reset-password#token_hash=",
    "/reset-password#other=1",
    // Only after the #: a query string would have reached a server.
    "/reset-password?token_hash=abc123",
  ])("finds nothing in %s", (path) => {
    window.history.replaceState(null, "", path);

    expect(readRecoveryToken()).toBeNull();
  });
});

describe("clearRecoveryToken", () => {
  it("removes the token and query string from the address", () => {
    window.history.replaceState(
      null,
      "",
      "/reset-password?sb_flow_id=x#token_hash=abc123",
    );

    clearRecoveryToken();

    expect(window.location.pathname).toBe("/reset-password");
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("");
  });
});

describe("verifyRecoveryToken", () => {
  it("uses the token and keeps the session in this tab only", async () => {
    auth.verifyOtp.mockResolvedValue({
      data: { user: { id: "user-1", email: "admin@example.org" } },
      error: null,
    });

    await expect(verifyRecoveryToken("abc123")).resolves.toEqual({
      id: "user-1",
      email: "admin@example.org",
    });

    expect(auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "abc123",
      type: "recovery",
    });
    expect(setSessionPersistence).toHaveBeenCalledWith(false);
    expect(
      vi.mocked(setSessionPersistence).mock.invocationCallOrder[0],
    ).toBeLessThan(auth.verifyOtp.mock.invocationCallOrder[0] ?? 0);
    expect(clearSessionPersistence).not.toHaveBeenCalled();
  });

  it("reports a bad link and leaves an existing session where it is", async () => {
    auth.verifyOtp.mockResolvedValue({
      data: { user: null },
      error: expired,
    });

    const failure: unknown = await verifyRecoveryToken("abc123").catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(PasswordResetFailure);
    expect(failure).toHaveProperty("kind", "linkInvalid");
    expect(clearSessionPersistence).toHaveBeenCalledOnce();
  });

  it("treats a response with no user as a failure", async () => {
    auth.verifyOtp.mockResolvedValue({ data: { user: null }, error: null });

    await expect(verifyRecoveryToken("abc123")).rejects.toHaveProperty(
      "kind",
      "unknown",
    );
    expect(clearSessionPersistence).toHaveBeenCalledOnce();
  });
});

describe("updatePassword", () => {
  it("saves the new password", async () => {
    auth.updateUser.mockResolvedValue({ data: {}, error: null });

    await updatePassword("NewPassword2");

    expect(auth.updateUser).toHaveBeenCalledWith({ password: "NewPassword2" });
  });

  it("reports a refused password", async () => {
    auth.updateUser.mockResolvedValue({
      data: {},
      error: new AuthApiError("Same", 422, "same_password"),
    });

    await expect(updatePassword("NewPassword2")).rejects.toHaveProperty(
      "kind",
      "samePassword",
    );
  });
});
