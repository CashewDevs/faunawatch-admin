import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { successNoticeMs, useNotice } from "./useNotice";

describe("useNotice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("closes a success message on its own", () => {
    const { result } = renderHook(() => useNotice());

    act(() => {
      result.current.show("success", "Saved.");
    });
    expect(result.current.notice?.message).toBe("Saved.");

    act(() => {
      vi.advanceTimersByTime(successNoticeMs);
    });
    expect(result.current.notice).toBeNull();
  });

  it("keeps an error until dismissed", () => {
    const { result } = renderHook(() => useNotice());

    act(() => {
      result.current.show("error", "Failed.");
    });
    act(() => {
      vi.advanceTimersByTime(successNoticeMs * 2);
    });
    expect(result.current.notice?.tone).toBe("error");

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.notice).toBeNull();
  });
});
