import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper } from "../../../test/queryWrapper";
import { fetchSpeciesBreakdown } from "../services/analyticsService";
import { mockSpeciesBreakdown } from "../services/mockAnalytics";
import { useSpeciesViewModel } from "./useSpeciesViewModel";

vi.mock("../services/analyticsService", () => ({
  fetchSpeciesBreakdown: vi.fn(),
}));

const fetchSpeciesBreakdownMock = vi.mocked(fetchSpeciesBreakdown);

describe("useSpeciesViewModel", () => {
  beforeEach(() => {
    fetchSpeciesBreakdownMock.mockReset();
    fetchSpeciesBreakdownMock.mockImplementation((range) =>
      Promise.resolve(mockSpeciesBreakdown(range)),
    );
  });

  it("derives species bars, category shares, and severity shares", async () => {
    const { result } = renderHook(() => useSpeciesViewModel("30d"), {
      wrapper: createQueryWrapper(),
    });
    expect(result.current.state.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });
    expect(result.current.topSpecies[0]).toMatchObject({
      commonName: "Philippine Tarsier",
      count: 482,
      barPercent: 100,
    });
    expect(result.current.categoryShares.map((share) => share.key)).toEqual([
      "mammal",
      "bird",
      "reptile",
      "amphibian",
      "insect",
    ]);
    expect(result.current.severityShares).toEqual([
      { key: "low", count: 2228, percent: 58, medianReviewMinutes: 324 },
      { key: "medium", count: 1230, percent: 32, medianReviewMinutes: 126 },
      { key: "high", count: 384, percent: 10, medianReviewMinutes: 25 },
    ]);
  });

  it("reports an error", async () => {
    fetchSpeciesBreakdownMock.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useSpeciesViewModel("7d"), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => {
      expect(result.current.state.isError).toBe(true);
    });
    expect(result.current.topSpecies).toEqual([]);
  });
});
