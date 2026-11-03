import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper } from "../../../test/queryWrapper";
import { testAnalyticsData } from "../../../test/fixtures/analytics";
import { fetchAnalyticsData } from "../services/analyticsService";
import { useSpeciesViewModel } from "./useSpeciesViewModel";

vi.mock("../services/analyticsService", () => ({
  fetchAnalyticsData: vi.fn(),
}));

const fetchAnalyticsDataMock = vi.mocked(fetchAnalyticsData);

describe("useSpeciesViewModel", () => {
  beforeEach(() => {
    fetchAnalyticsDataMock.mockReset();
    fetchAnalyticsDataMock.mockImplementation((range) =>
      Promise.resolve(testAnalyticsData(range)),
    );
  });

  it("derives species bars, category shares, and severity tiers", async () => {
    const { result } = renderHook(() => useSpeciesViewModel("30d"), {
      wrapper: createQueryWrapper(),
    });
    expect(result.current.state.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    expect(
      result.current.topSpecies.map((s) => [s.commonName, s.count]),
    ).toEqual([
      ["Philippine Eagle", 6],
      ["Cane Toad", 5],
      ["Philippine Tarsier", 5],
    ]);
    expect(result.current.topSpecies[0]?.barPercent).toBe(100);
    expect(
      result.current.categoryShares.map((share) => [share.key, share.count]),
    ).toEqual([
      ["animal_in_need", 5],
      ["potentially_dangerous_animal", 5],
      ["possible_invasive_species", 5],
      ["other_wildlife_incident", 5],
    ]);
    expect(result.current.severityShares).toEqual([
      { key: "low", count: 4, percent: 20, medianReviewMinutes: 480 },
      { key: "medium", count: 8, percent: 40, medianReviewMinutes: 660 },
      { key: "high", count: 4, percent: 20, medianReviewMinutes: 660 },
      { key: "unrated", count: 4, percent: 20, medianReviewMinutes: 840 },
    ]);
  });

  it("reports an error", async () => {
    fetchAnalyticsDataMock.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useSpeciesViewModel("7d"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.state.isError).toBe(true);
    });
    expect(result.current.topSpecies).toEqual([]);
  });
});
