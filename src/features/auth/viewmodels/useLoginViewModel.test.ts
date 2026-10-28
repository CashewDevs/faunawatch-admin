import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppStrings } from "../../../core/constants/appStrings";
import { createQueryWrapper } from "../../../test/queryWrapper";
import { AuthFailure } from "../models/authSession";
import { fetchAdminProfile, signIn, signOut } from "../services/authService";
import { useLoginViewModel } from "./useLoginViewModel";

vi.mock("../services/authService", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  fetchAdminProfile: vi.fn(),
}));

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
