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

function renderViewModel(token: string | null = "pk.test") {
  return renderHook(() => useHotspotsViewModel("30d", token), {
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

  it("maps the range's grid cells, named by their centre", async () => {
    const { result } = renderViewModel();

    await waitFor(() => {
      expect(result.current.hotspots).toHaveLength(3);
    });
    expect(fetchSectorCellsMock).toHaveBeenCalledWith("30d");
    // Quietest first, so the busiest is drawn on top.
    expect(result.current.hotspots.at(-1)).toMatchObject({
      name: "7.05°N, 125.25°E",
      latitude: 7.05,
      longitude: 125.25,
      sightingCount: 12,
      density: "critical",
    });
    expect(result.current.isHotspotsEmpty).toBe(false);
    expect(result.current.isCategoryEmpty).toBe(false);
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
      ["10.35°N, 123.95°E", 2],
      ["7.05°N, 125.25°E", 8],
    ]);
    expect(fetchSectorCellsMock).toHaveBeenCalledTimes(1);
  });

  it("says when the chosen category has no hotspots", async () => {
    fetchSectorCellsMock.mockResolvedValue([
      {
        latitude: 10.25,
        longitude: 123.85,
        reportCount: 7,
        categoryCounts: { animal_in_need: 7 },
      },
    ]);
    const { result } = renderViewModel();
    await waitFor(() => {
      expect(result.current.hotspots).toHaveLength(1);
    });

    act(() => {
      result.current.changeCategory("possible_invasive_species");
    });

    expect(result.current.hotspots).toEqual([]);
    expect(result.current.isCategoryEmpty).toBe(true);
    expect(result.current.isHotspotsEmpty).toBe(false);
  });

  it("is empty when no area in the range has enough reports", async () => {
    fetchSectorCellsMock.mockResolvedValue([]);
    const { result } = renderViewModel();

    await waitFor(() => {
      expect(result.current.hotspotsState.isLoading).toBe(false);
    });
    expect(result.current.isHotspotsEmpty).toBe(true);
    expect(result.current.isCategoryEmpty).toBe(false);
  });

  it("keeps the hotspot list the same between renders", async () => {
    const { result, rerender } = renderViewModel();
    await waitFor(() => {
      expect(result.current.hotspots).toHaveLength(3);
    });
    const first = result.current.hotspots;

    rerender();

    expect(result.current.hotspots).toBe(first);
  });

  it("hands over the map token until the map fails", () => {
    const { result } = renderViewModel();
    expect(result.current.mapToken).toBe("pk.test");

    act(() => {
      result.current.reportMapFailed();
    });

    expect(result.current.mapToken).toBeNull();
  });

  it("has no map without a token", () => {
    const { result } = renderViewModel(null);
    expect(result.current.mapToken).toBeNull();
  });

  it("asks the map to fit every hotspot on Show all", () => {
    const { result } = renderViewModel();
    expect(result.current.fitAllRequest).toBe(0);

    act(() => {
      result.current.showAllHotspots();
    });
    act(() => {
      result.current.showAllHotspots();
    });

    expect(result.current.fitAllRequest).toBe(2);
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
