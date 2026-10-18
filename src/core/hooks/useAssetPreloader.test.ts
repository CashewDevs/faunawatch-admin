import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAssetPreloader } from "./useAssetPreloader";

const decode = vi.fn<() => Promise<void>>();

class MockImage {
  src = "";
  decode = decode;
}

const URLS = ["/a.png", "/b.svg"] as const;
const OPTIONS = { minDurationMs: 500, timeoutMs: 3000 };

describe("useAssetPreloader", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("Image", MockImage);
    decode.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("becomes ready only after assets load and the minimum duration passes", async () => {
    decode.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAssetPreloader(URLS, undefined, OPTIONS),
    );

    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(result.current).toBe(false);

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(result.current).toBe(true);
    expect(decode).toHaveBeenCalledTimes(URLS.length);
  });

  it("does not let a failed asset block the app", async () => {
    decode.mockRejectedValue(new Error("broken image"));
    const { result } = renderHook(() =>
      useAssetPreloader(URLS, undefined, OPTIONS),
    );

    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(result.current).toBe(true);
  });

  it("gives up waiting after the timeout", async () => {
    decode.mockReturnValue(new Promise<void>(() => undefined));
    const { result } = renderHook(() =>
      useAssetPreloader(URLS, undefined, OPTIONS),
    );

    await act(() => vi.advanceTimersByTimeAsync(2999));
    expect(result.current).toBe(false);

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(result.current).toBe(true);
  });
});
