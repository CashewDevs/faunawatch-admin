import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper } from "../../../test/queryWrapper";
import {
  fetchHotspots,
  fetchInvasiveAlerts,
} from "../services/analyticsService";
import { mockHotspots, mockInvasiveAlerts } from "../services/mockAnalytics";
import { useHotspotsViewModel } from "./useHotspotsViewModel";

vi.mock("../services/analyticsService", () => ({
  fetchHotspots: vi.fn(),
  fetchInvasiveAlerts: vi.fn(),
}));

const fetchHotspotsMock = vi.mocked(fetchHotspots);
const fetchInvasiveAlertsMock = vi.mocked(fetchInvasiveAlerts);
const now = new Date("2026-10-30T00:00:00Z");

describe("useHotspotsViewModel", () => {
  beforeEach(() => {
    fetchHotspotsMock.mockReset();
    fetchInvasiveAlertsMock.mockReset();
    fetchHotspotsMock.mockImplementation((range, category) =>
      Promise.resolve(mockHotspots(range, category)),
    );
    fetchInvasiveAlertsMock.mockImplementation((range) =>
      Promise.resolve(mockInvasiveAlerts(range, now)),
    );
  });

  it("places hotspots and loads the alerts for the range", async () => {
    const { result } = renderHook(() => useHotspotsViewModel("30d"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.hotspots).toHaveLength(6);
    });
    const mtApo = result.current.hotspots.find((h) => h.id === "mt-apo");
    expect(mtApo).toMatchObject({
      sightingCount: 812,
      density: "critical",
      isLabelled: true,
    });

    await waitFor(() => {
      expect(result.current.alerts).toHaveLength(4);
    });
    expect(result.current.alerts[0]?.reportedOn).toBe("2026-10-30");
    expect(result.current.isViewAllAlertsAvailable).toBe(false);
  });

  it("refetches hotspots for a species category", async () => {
    const { result } = renderHook(() => useHotspotsViewModel("30d"), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => {
      expect(result.current.hotspotsState.isLoading).toBe(false);
    });

    act(() => {
      result.current.changeCategory("bird");
    });

    expect(result.current.category).toBe("bird");
    await waitFor(() => {
      expect(
        result.current.hotspots.find((h) => h.id === "mt-apo")?.sightingCount,
      ).toBe(300);
    });
    expect(fetchHotspotsMock).toHaveBeenLastCalledWith("30d", "bird");
  });
});
