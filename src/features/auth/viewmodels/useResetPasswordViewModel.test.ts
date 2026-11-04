import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNavigate } from "react-router";
import { AppRoutes } from "../../../core/constants/appRoutes";
import { AppStrings } from "../../../core/constants/appStrings";
import { createRouterQueryWrapper } from "../../../test/routerWrapper";
import { AuthFailure } from "../models/authSession";
import {
  PasswordResetFailure,
  passwordUpdatedState,
} from "../models/passwordReset";
import { fetchAdminProfile, signOut } from "../services/authService";
import {
  clearRecoveryUrl,
  endRecovery,
  exchangeRecoveryCode,
  readRecoveryArrival,
  resumeRecoverySession,
  updatePassword,
  verifyRecoveryToken,
} from "../services/passwordResetService";
import { useResetPasswordViewModel } from "./useResetPasswordViewModel";

vi.mock("../services/authService", () => ({
  signOut: vi.fn(),
  fetchAdminProfile: vi.fn(),
}));

vi.mock("../services/passwordResetService", () => ({
  readRecoveryArrival: vi.fn(),
  clearRecoveryUrl: vi.fn(),
  endRecovery: vi.fn(),
  exchangeRecoveryCode: vi.fn(),
  resumeRecoverySession: vi.fn(),
  verifyRecoveryToken: vi.fn(),
  updatePassword: vi.fn(),
}));

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: vi.fn(),
}));

const strings = AppStrings.resetPassword;
const user = { id: "user-1", email: "admin@example.org" };
const navigate = vi.fn();
const goodPassword = "NewPassword2";

function renderViewModel() {
  return renderHook(() => useResetPasswordViewModel(), {
    wrapper: createRouterQueryWrapper(AppRoutes.resetPassword),
  });
}

type Result = ReturnType<typeof renderViewModel>["result"];

function fillIn(
  result: Result,
  password = goodPassword,
  confirmation = password,
) {
  act(() => {
    result.current.changePassword(password);
    result.current.changeConfirmation(confirmation);
  });
}

async function save(result: Result) {
  await act(async () => {
    await result.current.submit();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useNavigate).mockReturnValue(navigate);
  vi.mocked(readRecoveryArrival).mockReturnValue({
    kind: "token",
    tokenHash: "token-1",
  });
  vi.mocked(verifyRecoveryToken).mockResolvedValue(user);
  vi.mocked(updatePassword).mockResolvedValue();
  vi.mocked(signOut).mockResolvedValue();
  vi.mocked(fetchAdminProfile).mockResolvedValue({
    id: user.id,
    displayName: "Maria",
  });
});

describe("opening the page", () => {
  it("offers the form when the link has a token, without using it", () => {
    const { result } = renderViewModel();

    expect(result.current.blockedMessage).toBeUndefined();
    expect(verifyRecoveryToken).not.toHaveBeenCalled();
  });

  it("explains the problem when the link has no token", () => {
    vi.mocked(readRecoveryArrival).mockReturnValue({ kind: "none" });

    const { result } = renderViewModel();

    expect(result.current.blockedMessage).toBe(strings.blocked.linkInvalid);
  });
});

describe("saving", () => {
  it("uses the link, saves, signs out and returns to login", async () => {
    const { result } = renderViewModel();
    fillIn(result);

    await save(result);

    expect(verifyRecoveryToken).toHaveBeenCalledWith("token-1");
    expect(clearRecoveryUrl).toHaveBeenCalledOnce();
    expect(updatePassword).toHaveBeenCalledWith(goodPassword);
    expect(signOut).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(AppRoutes.login, {
      replace: true,
      state: passwordUpdatedState,
    });
  });

  it("signs out only after the password is saved", async () => {
    const { result } = renderViewModel();
    fillIn(result);

    await save(result);

    expect(
      vi.mocked(updatePassword).mock.invocationCallOrder[0] ?? 0,
    ).toBeLessThan(vi.mocked(signOut).mock.invocationCallOrder[0] ?? 0);
  });

  it("doesn't use the link when the form is invalid", async () => {
    const { result } = renderViewModel();
    fillIn(result, "short");

    await save(result);

    expect(result.current.passwordError).toBe(strings.errors.passwordTooShort);
    expect(verifyRecoveryToken).not.toHaveBeenCalled();
  });

  it("shows a mismatch and clears it when the field changes", async () => {
    const { result } = renderViewModel();
    fillIn(result, goodPassword, "Different1");

    await save(result);

    expect(result.current.confirmationError).toBe(
      strings.errors.confirmationMismatch,
    );

    act(() => {
      result.current.changeConfirmation(goodPassword);
    });

    expect(result.current.confirmationError).toBeUndefined();
  });

  it("ignores a second press while saving", async () => {
    let finish: () => void = () => undefined;
    vi.mocked(updatePassword).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderViewModel();
    fillIn(result);

    let first: Promise<void> | undefined;
    await act(async () => {
      first = result.current.submit();
      await Promise.resolve();
    });
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      await result.current.submit();
      finish();
      await first;
    });

    expect(verifyRecoveryToken).toHaveBeenCalledOnce();
    expect(updatePassword).toHaveBeenCalledOnce();
  });
});

describe("a link that can't be used", () => {
  it("explains a used or expired link and changes nothing", async () => {
    vi.mocked(verifyRecoveryToken).mockRejectedValue(
      new PasswordResetFailure("linkInvalid"),
    );
    const { result } = renderViewModel();
    fillIn(result);

    await save(result);

    expect(result.current.blockedMessage).toBe(strings.blocked.linkInvalid);
    expect(updatePassword).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("keeps the form so a dropped connection can be retried", async () => {
    vi.mocked(verifyRecoveryToken).mockRejectedValueOnce(
      new PasswordResetFailure("network"),
    );
    const { result } = renderViewModel();
    fillIn(result);

    await save(result);

    expect(result.current.formError).toBe(AppStrings.login.errors.network);
    expect(result.current.blockedMessage).toBeUndefined();
    expect(clearRecoveryUrl).not.toHaveBeenCalled();

    await save(result);

    expect(verifyRecoveryToken).toHaveBeenCalledTimes(2);
    expect(updatePassword).toHaveBeenCalledOnce();
  });
});

describe("a non-admin account", () => {
  it("signs out and leaves the password alone", async () => {
    vi.mocked(fetchAdminProfile).mockResolvedValue(null);
    const { result } = renderViewModel();
    fillIn(result);

    await save(result);

    expect(signOut).toHaveBeenCalledOnce();
    expect(updatePassword).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.blockedMessage).toBe(strings.blocked.notAdmin);
  });

  it("fails closed when the admin check itself fails", async () => {
    vi.mocked(fetchAdminProfile).mockRejectedValue(new AuthFailure("network"));
    const { result } = renderViewModel();
    fillIn(result);

    await save(result);

    expect(signOut).toHaveBeenCalledOnce();
    expect(updatePassword).not.toHaveBeenCalled();
    expect(result.current.blockedMessage).toBe(strings.blocked.checkFailed);
  });
});

describe("a refused password", () => {
  it.each([
    ["weakPassword", strings.errors.passwordWeak],
    ["samePassword", strings.errors.passwordSame],
  ] as const)(
    "%s can be retried without using the link again",
    async (kind, message) => {
      vi.mocked(updatePassword).mockRejectedValueOnce(
        new PasswordResetFailure(kind),
      );
      const { result } = renderViewModel();
      fillIn(result);

      await save(result);

      expect(result.current.passwordError).toBe(message);
      expect(signOut).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();

      fillIn(result, "AnotherPassword3");
      await save(result);

      expect(verifyRecoveryToken).toHaveBeenCalledOnce();
      expect(updatePassword).toHaveBeenLastCalledWith("AnotherPassword3");
      expect(navigate).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ["rateLimited", AppStrings.login.errors.rateLimited],
    ["network", AppStrings.login.errors.network],
    ["unknown", AppStrings.login.errors.unknown],
  ] as const)(
    "%s shows a form error and stays signed in",
    async (kind, message) => {
      vi.mocked(updatePassword).mockRejectedValueOnce(
        new PasswordResetFailure(kind),
      );
      const { result } = renderViewModel();
      fillIn(result);

      await save(result);

      expect(result.current.formError).toBe(message);
      expect(signOut).not.toHaveBeenCalled();

      act(() => {
        result.current.changePassword("AnotherPassword3");
      });

      expect(result.current.formError).toBeUndefined();
    },
  );
});

describe("password visibility", () => {
  it("toggles", () => {
    const { result } = renderViewModel();

    act(() => {
      result.current.togglePasswordVisibility();
    });
    expect(result.current.isPasswordVisible).toBe(true);

    act(() => {
      result.current.togglePasswordVisibility();
    });
    expect(result.current.isPasswordVisible).toBe(false);
  });
});

describe("offering a new link", () => {
  it("isn't needed while the form is up", () => {
    const { result } = renderViewModel();

    expect(result.current.canRequestNewLink).toBe(false);
  });

  it("is offered for a bad link", () => {
    vi.mocked(readRecoveryArrival).mockReturnValue({ kind: "none" });

    const { result } = renderViewModel();

    expect(result.current.canRequestNewLink).toBe(true);
  });

  it("is offered when the admin check failed", async () => {
    vi.mocked(fetchAdminProfile).mockRejectedValue(new AuthFailure("network"));
    const { result } = renderViewModel();
    fillIn(result);

    await save(result);

    expect(result.current.canRequestNewLink).toBe(true);
  });

  it("isn't offered to a non-admin, whom it can't help", async () => {
    vi.mocked(fetchAdminProfile).mockResolvedValue(null);
    const { result } = renderViewModel();
    fillIn(result);

    await save(result);

    expect(result.current.canRequestNewLink).toBe(false);
  });
});

describe("a default link", () => {
  beforeEach(() => {
    vi.mocked(readRecoveryArrival).mockReturnValue({
      kind: "code",
      code: "code-1",
    });
    vi.mocked(exchangeRecoveryCode).mockResolvedValue(user);
  });

  it("opens the form as the page loads, showing loading until then", async () => {
    const { result } = renderViewModel();

    expect(result.current.isOpening).toBe(true);
    expect(result.current.blockedMessage).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isOpening).toBe(false);
    });

    expect(exchangeRecoveryCode).toHaveBeenCalledWith("code-1");
    expect(result.current.blockedMessage).toBeUndefined();
  });

  it("saves without using a token, then ends the reset", async () => {
    const { result } = renderViewModel();
    await waitFor(() => {
      expect(result.current.isOpening).toBe(false);
    });
    fillIn(result);

    await save(result);

    expect(verifyRecoveryToken).not.toHaveBeenCalled();
    expect(updatePassword).toHaveBeenCalledWith(goodPassword);
    expect(endRecovery).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(AppRoutes.login, {
      replace: true,
      state: passwordUpdatedState,
    });
  });

  it("does nothing if Save is pressed while still opening", async () => {
    const { result } = renderViewModel();
    fillIn(result);

    await save(result);

    expect(updatePassword).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.isOpening).toBe(false);
    });
  });

  it.each([
    ["linkInvalid", strings.blocked.linkInvalid, true],
    ["otherBrowser", strings.blocked.otherBrowser, true],
    ["network", strings.blocked.checkFailed, true],
    ["rateLimited", strings.blocked.checkFailed, true],
    ["unknown", strings.blocked.checkFailed, true],
  ] as const)(
    "explains a %s failure and offers a new link",
    async (kind, message, canRequest) => {
      vi.mocked(exchangeRecoveryCode).mockRejectedValue(
        new PasswordResetFailure(kind),
      );

      const { result } = renderViewModel();

      await waitFor(() => {
        expect(result.current.isOpening).toBe(false);
      });
      expect(result.current.blockedMessage).toBe(message);
      expect(result.current.canRequestNewLink).toBe(canRequest);
      expect(signOut).not.toHaveBeenCalled();
    },
  );

  it("signs a non-admin out straight away", async () => {
    vi.mocked(fetchAdminProfile).mockResolvedValue(null);

    const { result } = renderViewModel();

    await waitFor(() => {
      expect(result.current.blockedMessage).toBe(strings.blocked.notAdmin);
    });
    expect(endRecovery).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
    expect(result.current.canRequestNewLink).toBe(false);
  });

  it("fails closed when the admin check fails", async () => {
    vi.mocked(fetchAdminProfile).mockRejectedValue(new AuthFailure("network"));

    const { result } = renderViewModel();

    await waitFor(() => {
      expect(result.current.blockedMessage).toBe(strings.blocked.checkFailed);
    });
    expect(signOut).toHaveBeenCalled();
  });
});

describe("a link Supabase already refused", () => {
  it("explains it and cleans the address", () => {
    vi.mocked(readRecoveryArrival).mockReturnValue({ kind: "failed" });

    const { result } = renderViewModel();

    expect(result.current.isOpening).toBe(false);
    expect(result.current.blockedMessage).toBe(strings.blocked.linkInvalid);
    expect(clearRecoveryUrl).toHaveBeenCalled();
    expect(exchangeRecoveryCode).not.toHaveBeenCalled();
  });
});

describe("reloading during a reset", () => {
  beforeEach(() => {
    vi.mocked(readRecoveryArrival).mockReturnValue({ kind: "resume" });
  });

  it("keeps the form while the session lasts", async () => {
    vi.mocked(resumeRecoverySession).mockResolvedValue(user);
    const { result } = renderViewModel();

    await waitFor(() => {
      expect(result.current.isOpening).toBe(false);
    });
    expect(result.current.blockedMessage).toBeUndefined();

    fillIn(result);
    await save(result);

    expect(verifyRecoveryToken).not.toHaveBeenCalled();
    expect(updatePassword).toHaveBeenCalledWith(goodPassword);
  });

  it("explains when the session has ended", async () => {
    vi.mocked(resumeRecoverySession).mockResolvedValue(null);

    const { result } = renderViewModel();

    await waitFor(() => {
      expect(result.current.blockedMessage).toBe(strings.blocked.linkInvalid);
    });
  });
});
