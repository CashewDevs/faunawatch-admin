import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppStrings } from "../../../core/constants/appStrings";
import { useLoginViewModel } from "./useLoginViewModel";

describe("useLoginViewModel", () => {
  it("starts empty with no errors", () => {
    const { result } = renderHook(() => useLoginViewModel());
    expect(result.current.email).toBe("");
    expect(result.current.password).toBe("");
    expect(result.current.rememberMe).toBe(false);
    expect(result.current.isPasswordVisible).toBe(false);
    expect(result.current.emailError).toBeUndefined();
    expect(result.current.passwordError).toBeUndefined();
  });

  it("shows error messages when submitting empty fields", () => {
    const { result } = renderHook(() => useLoginViewModel());
    act(() => {
      result.current.submit();
    });
    expect(result.current.emailError).toBe(
      AppStrings.login.errors.emailRequired,
    );
    expect(result.current.passwordError).toBe(
      AppStrings.login.errors.passwordRequired,
    );
  });

  it("shows the invalid-email message for a malformed email", () => {
    const { result } = renderHook(() => useLoginViewModel());
    act(() => {
      result.current.changeEmail("nope");
      result.current.changePassword("secret");
    });
    act(() => {
      result.current.submit();
    });
    expect(result.current.emailError).toBe(
      AppStrings.login.errors.emailInvalid,
    );
    expect(result.current.passwordError).toBeUndefined();
  });

  it("clears a field's error when that field changes", () => {
    const { result } = renderHook(() => useLoginViewModel());
    act(() => {
      result.current.submit();
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
    const { result } = renderHook(() => useLoginViewModel());
    act(() => {
      result.current.togglePasswordVisibility();
      result.current.setRememberMe(true);
    });
    expect(result.current.isPasswordVisible).toBe(true);
    expect(result.current.rememberMe).toBe(true);
  });
});
