import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePostLocationMapViewModel } from "./usePostLocationMapViewModel";

describe("usePostLocationMapViewModel", () => {
  it("shows the map and opens and closes the full map", () => {
    const { result } = renderHook(() =>
      usePostLocationMapViewModel("pk.token"),
    );
    expect(result.current.mapToken).toBe("pk.token");
    expect(result.current.isFullMapOpen).toBe(false);

    act(() => {
      result.current.openFullMap();
    });
    expect(result.current.isFullMapOpen).toBe(true);

    act(() => {
      result.current.closeFullMap();
    });
    expect(result.current.isFullMapOpen).toBe(false);
  });

  it("has no map, and can't open one, without a token", () => {
    const { result } = renderHook(() => usePostLocationMapViewModel(null));
    expect(result.current.mapToken).toBeNull();

    act(() => {
      result.current.openFullMap();
    });
    expect(result.current.isFullMapOpen).toBe(false);
  });

  it("drops the map and closes the full map when it fails to load", () => {
    const { result } = renderHook(() =>
      usePostLocationMapViewModel("pk.token"),
    );
    act(() => {
      result.current.openFullMap();
    });

    act(() => {
      result.current.reportMapFailed();
    });
    expect(result.current.mapToken).toBeNull();
    expect(result.current.isFullMapOpen).toBe(false);
  });
});
