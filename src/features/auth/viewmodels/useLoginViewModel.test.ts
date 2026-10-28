import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppStrings } from "../../../core/constants/appStrings";
import { createQueryWrapper } from "../../../test/queryWrapper";
import { AuthFailure, type AuthErrorKind } from "../models/authSession";
import {
  fetchAdminProfile,
  signIn,
  signInWithGoogle,
  signOut,
} from "../services/authService";
import { useAuthSession } from "./authSessionContext";
import { useLoginViewModel } from "./useLoginViewModel";

vi.mock("../services/authService", () => ({
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  fetchAdminProfile: vi.fn(),
}));

vi.mock("./authSessionContext", () => ({
  useAuthSession: vi.fn(),
}));

const clearRejection = vi.fn();

function setRejection(rejection: AuthErrorKind | null) {
  vi.mocked(useAuthSession).mockReturnValue({
    status: "signedOut",
    admin: null,
    signOut: vi.fn(),
    rejection,
    clearRejection,
  });
}

const user = { id: "user-1", email: "admin@example.org" };

function renderLogin() {
  return renderHook(() => useLoginViewModel(), {
    wrapper: createQueryWrapper(),
  });
}

/** Fills in valid credentials and submits. */
async function submitValid(
  result: ReturnType<typeof renderLogin>["result"],
  remember = false,
) {
  act(() => {
    result.current.changeEmail("admin@example.org");
    result.current.changePassword("secret");
    result.current.setRememberMe(remember);
  });
  await act(async () => {
    await result.current.submit();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(signIn).mockResolvedValue(user);
  vi.mocked(signOut).mockResolvedValue();
  vi.mocked(fetchAdminProfile).mockResolvedValue({
    id: "user-1",
    displayName: "Maria",
  });
  vi.mocked(signInWithGoogle).mockReturnValue(new Promise(() => undefined));
  setRejection(null);
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useLoginViewModel", () => {
  it("starts empty with no errors", () => {
    const { result } = renderLogin();
    expect(result.current.email).toBe("");
    expect(result.current.password).toBe("");
    expect(result.current.rememberMe).toBe(false);
    expect(result.current.isPasswordVisible).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.emailError).toBeUndefined();
    expect(result.current.passwordError).toBeUndefined();
    expect(result.current.signInError).toBeUndefined();
  });

  it("shows error messages when submitting empty fields", async () => {
    const { result } = renderLogin();
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.emailError).toBe(
      AppStrings.login.errors.emailRequired,
    );
    expect(result.current.passwordError).toBe(
      AppStrings.login.errors.passwordRequired,
    );
    expect(signIn).not.toHaveBeenCalled();
  });

  it("shows the invalid-email message for a malformed email", async () => {
    const { result } = renderLogin();
    act(() => {
      result.current.changeEmail("nope");
      result.current.changePassword("secret");
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.emailError).toBe(
      AppStrings.login.errors.emailInvalid,
    );
    expect(result.current.passwordError).toBeUndefined();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("clears a field's error when that field changes", async () => {
    const { result } = renderLogin();
    await act(async () => {
      await result.current.submit();
    });
    act(() => {
      result.current.changeEmail("a");
    });
    expect(result.current.emailError).toBeUndefined();
    expect(result.current.passwordError).toBe(
      AppStrings.login.errors.passwordRequired,
    );
  });

  it("toggles password visibility and remember me", () => {
    const { result } = renderLogin();
    act(() => {
      result.current.togglePasswordVisibility();
      result.current.setRememberMe(true);
    });
    expect(result.current.isPasswordVisible).toBe(true);
    expect(result.current.rememberMe).toBe(true);
  });

  it("signs in an admin with the remember-me choice and keeps the session", async () => {
    const { result } = renderLogin();
    await submitValid(result, true);

    expect(signIn).toHaveBeenCalledWith(
      { email: "admin@example.org", password: "secret" },
      true,
    );
    expect(fetchAdminProfile).toHaveBeenCalledWith(user);
    expect(signOut).not.toHaveBeenCalled();
    expect(result.current.signInError).toBeUndefined();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("signs a non-admin out again and explains why", async () => {
    vi.mocked(fetchAdminProfile).mockResolvedValue(null);
    const { result } = renderLogin();
    await submitValid(result);

    expect(signOut).toHaveBeenCalled();
    expect(result.current.signInError).toBe(AppStrings.login.errors.notAdmin);
  });

  it("shows the message for rejected credentials without signing out", async () => {
    vi.mocked(signIn).mockRejectedValue(new AuthFailure("invalidCredentials"));
    const { result } = renderLogin();
    await submitValid(result);

    expect(signOut).not.toHaveBeenCalled();
    expect(result.current.signInError).toBe(
      AppStrings.login.errors.invalidCredentials,
    );
  });

  it("signs out when the admin check fails after signing in", async () => {
    vi.mocked(fetchAdminProfile).mockRejectedValue(new AuthFailure("network"));
    const { result } = renderLogin();
    await submitValid(result);

    expect(signOut).toHaveBeenCalled();
    expect(result.current.signInError).toBe(AppStrings.login.errors.network);
  });

  it("clears the sign-in error when the user edits a field", async () => {
    vi.mocked(signIn).mockRejectedValue(new AuthFailure("invalidCredentials"));
    const { result } = renderLogin();
    await submitValid(result);
    act(() => {
      result.current.changePassword("other");
    });

    expect(result.current.signInError).toBeUndefined();
  });

  it("is submitting while the sign-in is in progress", async () => {
    let finishSignIn: (value: typeof user) => void = () => undefined;
    vi.mocked(signIn).mockReturnValue(
      new Promise((resolve) => {
        finishSignIn = resolve;
      }),
    );
    const { result } = renderLogin();
    act(() => {
      result.current.changeEmail("admin@example.org");
      result.current.changePassword("secret");
    });
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.submit();
    });

    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      finishSignIn(user);
      await pending;
    });
    expect(result.current.isSubmitting).toBe(false);
  });
});

describe("useLoginViewModel with Google", () => {
  it("starts the redirect with the remember-me choice and stays busy", async () => {
    vi.mocked(signInWithGoogle).mockResolvedValue();
    const { result } = renderLogin();
    act(() => {
      result.current.setRememberMe(true);
    });

    await act(async () => {
      await result.current.continueWithGoogle();
    });

    expect(signInWithGoogle).toHaveBeenCalledWith(true);
    expect(result.current.isRedirecting).toBe(true);
    expect(result.current.isBusy).toBe(true);
  });

  it("shows why the redirect couldn't start and allows a retry", async () => {
    vi.mocked(signInWithGoogle).mockRejectedValue(new AuthFailure("network"));
    const { result } = renderLogin();

    await act(async () => {
      await result.current.continueWithGoogle();
    });

    expect(result.current.signInError).toBe(AppStrings.login.errors.network);
    expect(result.current.isRedirecting).toBe(false);
  });

  it("ignores email sign-in while redirecting to Google", async () => {
    const { result } = renderLogin();
    act(() => {
      void result.current.continueWithGoogle();
    });
    await submitValid(result);

    expect(signIn).not.toHaveBeenCalled();
  });

  it("ignores Google while an email sign-in is in progress", () => {
    vi.mocked(signIn).mockReturnValue(new Promise(() => undefined));
    const { result } = renderLogin();
    act(() => {
      result.current.changeEmail("admin@example.org");
      result.current.changePassword("secret");
    });
    act(() => {
      void result.current.submit();
    });
    act(() => {
      void result.current.continueWithGoogle();
    });

    expect(result.current.isBusy).toBe(true);
    expect(signInWithGoogle).not.toHaveBeenCalled();
  });

  it("re-enables Google when Back restores the page from the cache", () => {
    const { result } = renderLogin();
    act(() => {
      void result.current.continueWithGoogle();
    });
    expect(result.current.isRedirecting).toBe(true);

    act(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });

    expect(result.current.isRedirecting).toBe(false);
  });

  it("shows the session's rejection, e.g. a non-admin Google account", () => {
    setRejection("notAdmin");
    const { result } = renderLogin();

    expect(result.current.signInError).toBe(AppStrings.login.errors.notAdmin);
  });

  it("clears the session's rejection when the user edits a field or retries", () => {
    setRejection("oauthFailed");
    const { result } = renderLogin();

    act(() => {
      result.current.changeEmail("a");
    });
    expect(clearRejection).toHaveBeenCalledTimes(1);

    act(() => {
      void result.current.continueWithGoogle();
    });
    expect(clearRejection).toHaveBeenCalledTimes(2);
  });

  it("prefers its own sign-in error over the session's rejection", async () => {
    setRejection("oauthFailed");
    vi.mocked(signIn).mockRejectedValue(new AuthFailure("invalidCredentials"));
    const { result } = renderLogin();

    await submitValid(result);

    expect(result.current.signInError).toBe(
      AppStrings.login.errors.invalidCredentials,
    );
  });
});

describe("useLoginViewModel cooldown", () => {
  const strings = AppStrings.login;

  async function failTimes(
    result: ReturnType<typeof renderLogin>["result"],
    count: number,
  ) {
    vi.mocked(signIn).mockRejectedValue(new AuthFailure("invalidCredentials"));
    for (let attempt = 0; attempt < count; attempt += 1) {
      await submitValid(result);
    }
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date("2026-10-28T10:00:00Z"));
  });

  it("locks the form for 30 seconds after five wrong passwords", async () => {
    const { result } = renderLogin();
    await failTimes(result, 4);
    expect(result.current.isSubmitDisabled).toBe(false);

    await failTimes(result, 1);

    expect(result.current.isSubmitDisabled).toBe(true);
    expect(result.current.signInError).toBe(strings.errors.cooldown);
    expect(result.current.cooldownLabel).toBe(
      `${strings.submitCooldownPrefix} 30${strings.secondsSuffix}`,
    );

    await submitValid(result);
    expect(signIn).toHaveBeenCalledTimes(5);
  });

  it("counts down and unlocks when the time is up", async () => {
    const { result } = renderLogin();
    await failTimes(result, 5);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.cooldownLabel).toBe(
      `${strings.submitCooldownPrefix} 20${strings.secondsSuffix}`,
    );

    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(result.current.isSubmitDisabled).toBe(false);
    expect(result.current.cooldownLabel).toBeUndefined();
    expect(result.current.signInError).toBe(strings.errors.invalidCredentials);
  });

  it("stays locked after a reload", async () => {
    const first = renderLogin();
    await failTimes(first.result, 5);
    first.unmount();

    const { result } = renderLogin();

    expect(result.current.isSubmitDisabled).toBe(true);
    expect(result.current.signInError).toBe(strings.errors.cooldown);
  });

  it("waits 60 seconds after Supabase rate-limits the sign-in", async () => {
    vi.mocked(signIn).mockRejectedValue(new AuthFailure("rateLimited"));
    const { result } = renderLogin();
    await submitValid(result);

    expect(result.current.cooldownLabel).toBe(
      `${strings.submitCooldownPrefix} 60${strings.secondsSuffix}`,
    );

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.isSubmitDisabled).toBe(false);
    expect(result.current.signInError).toBeUndefined();
  });

  it("forgets wrong passwords after a correct one", async () => {
    const { result } = renderLogin();
    await failTimes(result, 4);
    vi.mocked(signIn).mockResolvedValue(user);
    await submitValid(result);

    await failTimes(result, 4);

    expect(result.current.isSubmitDisabled).toBe(false);
  });

  it("keeps Google sign-in available while locked", async () => {
    const { result } = renderLogin();
    await failTimes(result, 5);

    act(() => {
      void result.current.continueWithGoogle();
    });

    expect(signInWithGoogle).toHaveBeenCalled();
  });

  it("locks when another tab reaches the limit", () => {
    const { result } = renderLogin();
    const now = Date.now();
    window.localStorage.setItem(
      "faunawatch-admin.login-cooldown",
      JSON.stringify({
        failures: 5,
        lastFailureAt: now,
        lockedUntil: now + 30_000,
      }),
    );

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "faunawatch-admin.login-cooldown" }),
      );
    });

    expect(result.current.isSubmitDisabled).toBe(true);
  });
});
