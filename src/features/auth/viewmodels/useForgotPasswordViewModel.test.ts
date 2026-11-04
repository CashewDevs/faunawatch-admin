import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppStrings } from "../../../core/constants/appStrings";
import {
  PasswordResetFailure,
  resetEmailCooldownSeconds,
} from "../models/passwordReset";
import { requestPasswordReset } from "../services/passwordResetService";
import { useForgotPasswordViewModel } from "./useForgotPasswordViewModel";

vi.mock("../services/passwordResetService", () => ({
  requestPasswordReset: vi.fn(),
}));

const strings = AppStrings.forgotPassword;
const errors = AppStrings.login.errors;
const email = "admin@example.org";

function renderViewModel() {
  return renderHook(() => useForgotPasswordViewModel());
}

type Result = ReturnType<typeof renderViewModel>["result"];

async function submit(result: Result, address = email) {
  act(() => {
    result.current.changeEmail(address);
  });
  await act(async () => {
    await result.current.submit();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.mocked(requestPasswordReset).mockResolvedValue();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("asking for a link", () => {
  it("sends it and shows the confirmation", async () => {
    const { result } = renderViewModel();

    await submit(result);

    expect(requestPasswordReset).toHaveBeenCalledWith(email);
    expect(result.current.isSent).toBe(true);
    expect(result.current.sentMessage).toBe(
      `${strings.sentLead} ${email}${strings.sentTail}`,
    );
  });

  it("removes spaces around the address", async () => {
    const { result } = renderViewModel();

    await submit(result, `  ${email} `);

    expect(requestPasswordReset).toHaveBeenCalledWith(email);
  });

  it.each([
    ["", errors.emailRequired],
    ["not-an-email", errors.emailInvalid],
  ])("doesn't send with %j as the address", async (address, message) => {
    const { result } = renderViewModel();

    await submit(result, address);

    expect(result.current.emailError).toBe(message);
    expect(requestPasswordReset).not.toHaveBeenCalled();
    expect(result.current.isSent).toBe(false);
  });

  it("clears the field error when typing again", async () => {
    const { result } = renderViewModel();
    await submit(result, "");

    act(() => {
      result.current.changeEmail("a");
    });

    expect(result.current.emailError).toBeUndefined();
  });
});

describe("failures", () => {
  it("keeps the form and lets a dropped connection be retried", async () => {
    vi.mocked(requestPasswordReset).mockRejectedValueOnce(
      new PasswordResetFailure("network"),
    );
    const { result } = renderViewModel();

    await submit(result);

    expect(result.current.formError).toBe(errors.network);
    expect(result.current.isSent).toBe(false);
    expect(result.current.isDisabled).toBe(false);

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.isSent).toBe(true);
    expect(result.current.formError).toBeUndefined();
  });

  it("waits after Supabase says too many requests", async () => {
    vi.mocked(requestPasswordReset).mockRejectedValueOnce(
      new PasswordResetFailure("rateLimited"),
    );
    const { result } = renderViewModel();

    await submit(result);

    expect(result.current.formError).toBe(errors.rateLimited);
    expect(result.current.isSent).toBe(false);
    expect(result.current.isDisabled).toBe(true);
    expect(result.current.submitLabel).toBe(
      `${AppStrings.login.submitCooldownPrefix} ${String(resetEmailCooldownSeconds)}s`,
    );

    await act(async () => {
      await result.current.submit();
    });
    expect(requestPasswordReset).toHaveBeenCalledOnce();
  });

  it("shows anything else as a general error", async () => {
    vi.mocked(requestPasswordReset).mockRejectedValueOnce(new Error("boom"));
    const { result } = renderViewModel();

    await submit(result);

    expect(result.current.formError).toBe(errors.unknown);
  });
});

describe("sending again", () => {
  it("waits, then sends to the same address", async () => {
    const { result } = renderViewModel();
    await submit(result);

    expect(result.current.isDisabled).toBe(true);
    expect(result.current.sendAgainLabel).toBe(
      `${strings.sendAgain} ${strings.sendAgainIn} ${String(resetEmailCooldownSeconds)}s`,
    );

    await act(async () => {
      await result.current.sendAgain();
    });
    expect(requestPasswordReset).toHaveBeenCalledOnce();

    act(() => {
      vi.advanceTimersByTime(resetEmailCooldownSeconds * 1000);
    });
    expect(result.current.isDisabled).toBe(false);
    expect(result.current.sendAgainLabel).toBe(strings.sendAgain);

    await act(async () => {
      await result.current.sendAgain();
    });
    expect(requestPasswordReset).toHaveBeenCalledTimes(2);
    expect(requestPasswordReset).toHaveBeenLastCalledWith(email);
    expect(result.current.isDisabled).toBe(true);
  });

  it("keeps the confirmation when sending again fails", async () => {
    const { result } = renderViewModel();
    await submit(result);
    act(() => {
      vi.advanceTimersByTime(resetEmailCooldownSeconds * 1000);
    });
    vi.mocked(requestPasswordReset).mockRejectedValueOnce(
      new PasswordResetFailure("network"),
    );

    await act(async () => {
      await result.current.sendAgain();
    });

    expect(result.current.isSent).toBe(true);
    expect(result.current.formError).toBe(errors.network);
  });

  it("does nothing before a first request", async () => {
    const { result } = renderViewModel();

    await act(async () => {
      await result.current.sendAgain();
    });

    expect(requestPasswordReset).not.toHaveBeenCalled();
  });
});
