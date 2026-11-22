import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePostLocationMapViewModel } from "./usePostLocationMapViewModel";

const photos = [
  { url: "https://signed/first.jpg" },
  { url: "https://signed/second.jpg" },
];

describe("usePostLocationMapViewModel", () => {
  it("shows the map and opens and closes the full map", () => {
    const { result } = renderHook(() =>
      usePostLocationMapViewModel(photos, "pk.token"),
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

  it("opens the full map in 3D and switches between 3D and 2D", () => {
    const { result } = renderHook(() =>
      usePostLocationMapViewModel(photos, "pk.token"),
    );
    act(() => {
      result.current.openFullMap();
    });
    expect(result.current.fullMapMode).toBe("3d");

    act(() => {
      result.current.setFullMapMode("2d");
    });
    expect(result.current.fullMapMode).toBe("2d");

    // Reopening starts in 3D again, the app's default.
    act(() => {
      result.current.closeFullMap();
    });
    act(() => {
      result.current.openFullMap();
    });
    expect(result.current.fullMapMode).toBe("3d");
  });

  it("puts the first photo in the pin", () => {
    const { result } = renderHook(() =>
      usePostLocationMapViewModel(photos, "pk.token"),
    );
    expect(result.current.pinPhotoUrl).toBe("https://signed/first.jpg");
  });

  it("has no map, and can't open one, without a token", () => {
    const { result } = renderHook(() => usePostLocationMapViewModel([], null));
    expect(result.current.mapToken).toBeNull();

    act(() => {
      result.current.openFullMap();
    });
    expect(result.current.isFullMapOpen).toBe(false);
  });

  it("drops the map and closes the full map when it fails to load", () => {
    const { result } = renderHook(() =>
      usePostLocationMapViewModel(photos, "pk.token"),
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
