import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper } from "../../../test/queryWrapper";
import {
  testAnalyticsData,
  testSectorCells,
} from "../../../test/fixtures/analytics";
import {
  fetchAnalyticsData,
  fetchSectorCells,
  signAlertPhotos,
} from "../services/analyticsService";
import { useHotspotsViewModel } from "./useHotspotsViewModel";

vi.mock("../services/analyticsService", () => ({
  fetchAnalyticsData: vi.fn(),
  fetchSectorCells: vi.fn(),
  signAlertPhotos: vi.fn(),
}));

const fetchSectorCellsMock = vi.mocked(fetchSectorCells);
const signAlertPhotosMock = vi.mocked(signAlertPhotos);

function renderViewModel() {
  return renderHook(() => useHotspotsViewModel("30d"), {
    wrapper: createQueryWrapper(),
  });
}

describe("useHotspotsViewModel", () => {
  beforeEach(() => {
    vi.mocked(fetchAnalyticsData).mockImplementation((range) =>
      Promise.resolve(testAnalyticsData(range)),
    );
    fetchSectorCellsMock.mockReset();
    fetchSectorCellsMock.mockResolvedValue([...testSectorCells]);
    signAlertPhotosMock.mockReset();
    signAlertPhotosMock.mockImplementation((alerts) =>
      Promise.resolve(
        alerts.map((alert) => ({
          ...alert,
          photoUrl: `https://signed/${alert.photoPath ?? ""}`,
        })),
      ),
    );
  });

  it("places the range's grid cells, named by their centre", async () => {
    const { result } = renderViewModel();

    await waitFor(() => {
      expect(result.current.hotspots).toHaveLength(3);
    });
    expect(fetchSectorCellsMock).toHaveBeenCalledWith("30d");
    expect(result.current.hotspots[0]).toMatchObject({
      name: "7.05°N, 125.25°E",
      sightingCount: 12,
      density: "critical",
      isLabelled: true,
    });
  });

  it("filters cells by category without reloading", async () => {
    const { result } = renderViewModel();
    await waitFor(() => {
      expect(result.current.hotspotsState.isLoading).toBe(false);
    });

    act(() => {
      result.current.changeCategory("animal_in_need");
    });

    expect(result.current.category).toBe("animal_in_need");
    expect(
      result.current.hotspots.map((h) => [h.name, h.sightingCount]),
    ).toEqual([
      ["7.05°N, 125.25°E", 8],
      ["10.35°N, 123.95°E", 2],
    ]);
    expect(fetchSectorCellsMock).toHaveBeenCalledTimes(1);
  });

  it("lists the newest invasive reports and signs their photos", async () => {
    const { result } = renderViewModel();

    await waitFor(() => {
      expect(result.current.alerts[0]?.photoUrl).toMatch(/^https:\/\/signed/);
    });
    expect(result.current.alertCount).toBe(5);
    expect(result.current.alerts).toHaveLength(5);
    expect(result.current.alerts[0]).toMatchObject({
      id: "report-2",
      commonName: "Cane Toad",
    });
    expect(signAlertPhotosMock).toHaveBeenCalledTimes(1);
    expect(result.current.isViewAllAlertsAvailable).toBe(false);
  });

  it("shows alerts without photos until they are signed", async () => {
    signAlertPhotosMock.mockReturnValue(new Promise(() => undefined));
    const { result } = renderViewModel();

    await waitFor(() => {
      expect(result.current.alerts).toHaveLength(5);
    });
    expect(result.current.alerts[0]?.photoUrl).toBeNull();
  });
});
