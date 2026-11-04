import {
  AuthApiError,
  AuthPKCECodeVerifierMissingError,
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
  clearRecoveryUrl,
  endRecovery,
  exchangeRecoveryCode,
  readRecoveryArrival,
  requestPasswordReset,
  resetCodeExchangeForTests,
  resumeRecoverySession,
  toPasswordResetFailure,
  updatePassword,
  verifyRecoveryToken,
} from "./passwordResetService";

const auth = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getSession: vi.fn(),
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
const user = { id: "user-1", email: "admin@example.org" };

function firstCall(mock: { mock: { invocationCallOrder: number[] } }): number {
  return mock.mock.invocationCallOrder[0] ?? 0;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetCodeExchangeForTests();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("toPasswordResetFailure", () => {
  it.each([
    ["a used or expired link", expired, "linkInvalid"],
    [
      "an expired code",
      new AuthApiError("Expired", 400, "flow_state_expired"),
      "linkInvalid",
    ],
    [
      "an unknown code",
      new AuthApiError("Not found", 404, "flow_state_not_found"),
      "linkInvalid",
    ],
    [
      "a code from another browser",
      new AuthPKCECodeVerifierMissingError(),
      "otherBrowser",
    ],
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

describe("readRecoveryArrival", () => {
  it.each([
    [
      "a custom template's link",
      "/reset-password#token_hash=abc123",
      { kind: "token", tokenHash: "abc123" },
    ],
    [
      "a custom template's link with a query string",
      "/reset-password?sb_flow_id=x#token_hash=abc123",
      { kind: "token", tokenHash: "abc123" },
    ],
    [
      "a default link",
      "/reset-password?code=xyz",
      { kind: "code", code: "xyz" },
    ],
    [
      "a default link with a flow id",
      "/reset-password?code=xyz&sb_flow_id=x",
      { kind: "code", code: "xyz" },
    ],
    [
      "a refused link reported after the ?",
      "/reset-password?error=access_denied&error_code=otp_expired",
      { kind: "failed" },
    ],
    [
      "a refused link reported after the #",
      "/reset-password#error=access_denied&error_code=otp_expired",
      { kind: "failed" },
    ],
    ["no link", "/reset-password", { kind: "none" }],
    ["an empty token", "/reset-password#token_hash=", { kind: "none" }],
    ["something else", "/reset-password#other=1", { kind: "none" }],
    // Only after the #: a query string would have reached a server.
    ["a token after the ?", "/reset-password?token_hash=abc", { kind: "none" }],
  ])("recognises %s", (_name, path, arrival) => {
    window.history.replaceState(null, "", path);

    expect(readRecoveryArrival()).toEqual(arrival);
  });

  it("recognises a reset under way in this tab", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({
      data: { user },
      error: null,
    });
    await exchangeRecoveryCode("xyz");

    expect(readRecoveryArrival()).toEqual({ kind: "resume" });

    endRecovery();

    expect(readRecoveryArrival()).toEqual({ kind: "none" });
  });

  it("prefers a fresh link over a reset under way", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({
      data: { user },
      error: null,
    });
    await exchangeRecoveryCode("xyz");
    window.history.replaceState(null, "", "/reset-password?code=newer");

    expect(readRecoveryArrival()).toEqual({ kind: "code", code: "newer" });
  });
});

describe("clearRecoveryUrl", () => {
  it("removes the link's details from the address", () => {
    window.history.replaceState(
      null,
      "",
      "/reset-password?sb_flow_id=x#token_hash=abc123",
    );

    clearRecoveryUrl();

    expect(window.location.pathname).toBe("/reset-password");
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("");
  });
});

describe("verifyRecoveryToken", () => {
  it("uses the token and keeps the session in this tab only", async () => {
    auth.verifyOtp.mockResolvedValue({ data: { user }, error: null });

    await expect(verifyRecoveryToken("abc123")).resolves.toEqual(user);

    expect(auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "abc123",
      type: "recovery",
    });
    expect(setSessionPersistence).toHaveBeenCalledWith(false);
    expect(firstCall(vi.mocked(setSessionPersistence))).toBeLessThan(
      firstCall(auth.verifyOtp),
    );
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
    expect(readRecoveryArrival()).toEqual({ kind: "none" });
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

describe("exchangeRecoveryCode", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/reset-password?code=xyz");
  });

  it("uses the code, keeps the session in this tab, and cleans the URL", async () => {
    auth.exchangeCodeForSession.mockImplementation(() => {
      // It reads the flow id from the URL, so the URL must still be there.
      expect(window.location.search).toBe("?code=xyz");
      return Promise.resolve({ data: { user }, error: null });
    });

    await expect(exchangeRecoveryCode("xyz")).resolves.toEqual(user);

    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("xyz");
    expect(setSessionPersistence).toHaveBeenCalledWith(false);
    expect(firstCall(vi.mocked(setSessionPersistence))).toBeLessThan(
      firstCall(auth.exchangeCodeForSession),
    );
    expect(clearSessionPersistence).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });

  it("only exchanges once, because a second try would fail", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({
      data: { user },
      error: null,
    });

    const first = exchangeRecoveryCode("xyz");
    const second = exchangeRecoveryCode("xyz");

    await expect(first).resolves.toEqual(user);
    await expect(second).resolves.toEqual(user);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledOnce();
  });

  it("reports another browser, and leaves an existing session alone", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthPKCECodeVerifierMissingError(),
    });

    await expect(exchangeRecoveryCode("xyz")).rejects.toHaveProperty(
      "kind",
      "otherBrowser",
    );

    expect(clearSessionPersistence).toHaveBeenCalledOnce();
    expect(window.location.search).toBe("");
    expect(readRecoveryArrival()).toEqual({ kind: "none" });
  });
});

describe("resumeRecoverySession", () => {
  it("returns the account of the session in this tab", async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { user } },
      error: null,
    });

    await expect(resumeRecoverySession()).resolves.toEqual(user);
  });

  it("gives up when the session has ended", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({
      data: { user },
      error: null,
    });
    await exchangeRecoveryCode("xyz");
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(resumeRecoverySession()).resolves.toBeNull();

    expect(readRecoveryArrival()).toEqual({ kind: "none" });
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

describe("requestPasswordReset", () => {
  it("asks for a link that comes back to this site's reset page", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    await requestPasswordReset("admin@example.org");

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "admin@example.org",
      { redirectTo: `${window.location.origin}/reset-password` },
    );
  });

  it("saves the link's secret outside this tab, because the email opens a new one", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    await requestPasswordReset("admin@example.org");

    expect(setSessionPersistence).toHaveBeenCalledWith(true);
    expect(firstCall(vi.mocked(setSessionPersistence))).toBeLessThan(
      firstCall(auth.resetPasswordForEmail),
    );
    expect(clearSessionPersistence).toHaveBeenCalledOnce();
  });

  it("reports too many requests", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: new AuthApiError("Slow down", 429, "over_email_send_rate_limit"),
    });

    await expect(
      requestPasswordReset("admin@example.org"),
    ).rejects.toHaveProperty("kind", "rateLimited");
    expect(clearSessionPersistence).toHaveBeenCalledOnce();
  });
});
