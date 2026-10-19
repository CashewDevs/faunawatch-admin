import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper } from "../../../test/queryWrapper";
import {
  fetchModerationActivity,
  fetchTopContributors,
} from "../services/analyticsService";
import {
  mockModerationActivity,
  mockTopContributors,
} from "../services/mockAnalytics";
import { useModerationViewModel } from "./useModerationViewModel";

vi.mock("../services/analyticsService", () => ({
  fetchModerationActivity: vi.fn(),
  fetchTopContributors: vi.fn(),
}));

const fetchModerationActivityMock = vi.mocked(fetchModerationActivity);
const fetchTopContributorsMock = vi.mocked(fetchTopContributors);

describe("useModerationViewModel", () => {
  beforeEach(() => {
    fetchModerationActivityMock.mockReset();
    fetchTopContributorsMock.mockReset();
    fetchTopContributorsMock.mockImplementation((range) =>
      Promise.resolve(mockTopContributors(range, 5)),
    );
    fetchModerationActivityMock.mockImplementation((range) =>
      Promise.resolve(mockModerationActivity(range)),
    );
  });

  it("ranks contributors and derives approval rates", async () => {
    const { result } = renderHook(() => useModerationViewModel("30d"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.contributors).toHaveLength(5);
    });
    expect(result.current.contributors[0]).toMatchObject({
      fullName: "Dr. Aris Thorne",
      rank: 1,
      approvalRate: 96,
    });
  });

  it("shares reviewer decisions and sorts decline reasons", async () => {
    const { result } = renderHook(() => useModerationViewModel("30d"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.activityState.isLoading).toBe(false);
    });
    expect(result.current.reviewerShares.map((s) => s.percent)).toEqual([
      52, 34, 14,
    ]);
    expect(
      result.current.declineReasonShares.map((s) => [s.key, s.percent]),
    ).toEqual([
      ["inaccurateSpecies", 38],
      ["lowQualityPhoto", 26],
      ["domesticSpecimen", 18],
      ["duplicateSighting", 12],
      ["inaccurateLocation", 6],
    ]);
  });
});
