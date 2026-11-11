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

  it("changes the text of the message still shown, and nothing else", () => {
    const { result } = renderHook(() => useNotice());

    let first = 0;
    act(() => {
      first = result.current.show("error", "Already decided.");
    });
    act(() => {
      result.current.update(first, "Waiting for changes.");
    });
    expect(result.current.notice?.message).toBe("Waiting for changes.");
    expect(result.current.notice?.id).toBe(first);

    // A newer message is never overwritten by an update meant for an older one.
    act(() => {
      result.current.show("success", "Post approved.");
    });
    act(() => {
      result.current.update(first, "Too late.");
    });
    expect(result.current.notice?.message).toBe("Post approved.");

    // Nor is a dismissed one brought back.
    const current = result.current.notice?.id ?? 0;
    act(() => {
      result.current.dismiss();
    });
    act(() => {
      result.current.update(current, "Back again.");
    });
    expect(result.current.notice).toBeNull();
  });

  it("gives every message its own id", () => {
    const { result } = renderHook(() => useNotice());

    let ids: number[] = [];
    act(() => {
      ids = [
        result.current.show("error", "A"),
        result.current.show("error", "B"),
      ];
    });
    expect(ids[0]).not.toBe(ids[1]);
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
