import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "./useCountdown";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCountdown", () => {
  it("starts at zero", () => {
    const { result } = renderHook(() => useCountdown());

    expect(result.current.remainingSeconds).toBe(0);
  });

  it("counts down once a second and stops at zero", () => {
    const { result } = renderHook(() => useCountdown());

    act(() => {
      result.current.start(3);
    });
    expect(result.current.remainingSeconds).toBe(3);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.remainingSeconds).toBe(2);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.remainingSeconds).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stays accurate when timers are held back in a background tab", () => {
    const { result } = renderHook(() => useCountdown());
    act(() => {
      result.current.start(60);
    });

    // The clock moves on 30s while only one tick gets to run.
    vi.setSystemTime(Date.now() + 29_000);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.remainingSeconds).toBe(30);
  });

  it("stops its timer when the screen goes away", () => {
    const { result, unmount } = renderHook(() => useCountdown());
    act(() => {
      result.current.start(60);
    });

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
