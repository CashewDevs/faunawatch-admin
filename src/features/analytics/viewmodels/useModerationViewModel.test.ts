import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppStrings } from "../../../core/constants/appStrings";
import { createQueryWrapper } from "../../../test/queryWrapper";
import { testAnalyticsData } from "../../../test/fixtures/analytics";
import { fetchAnalyticsData } from "../services/analyticsService";
import { useModerationViewModel } from "./useModerationViewModel";

vi.mock("../services/analyticsService", () => ({
  fetchAnalyticsData: vi.fn(),
}));

const fetchAnalyticsDataMock = vi.mocked(fetchAnalyticsData);

function renderViewModel() {
  return renderHook(() => useModerationViewModel("30d"), {
    wrapper: createQueryWrapper(),
  });
}

describe("useModerationViewModel", () => {
  beforeEach(() => {
    fetchAnalyticsDataMock.mockReset();
    fetchAnalyticsDataMock.mockImplementation((range) =>
      Promise.resolve(testAnalyticsData(range)),
    );
  });

  it("ranks contributors and derives approval rates", async () => {
    const { result } = renderViewModel();

    await waitFor(() => {
      expect(result.current.contributors).toHaveLength(3);
    });
    expect(
      result.current.contributors.map((c) => [c.fullName, c.submissions]),
    ).toEqual([
      ["Maria Santos", 7],
      ["Mateo Dela Cruz", 7],
      ["Dr. Aris Thorne", 6],
    ]);
    expect(result.current.contributors[0]).toMatchObject({
      rank: 1,
      approvalRate: 60,
    });
  });

  it("shares reviewer decisions and sorts the decline reasons used", async () => {
    const { result } = renderViewModel();

    await waitFor(() => {
      expect(result.current.activityState.isLoading).toBe(false);
    });
    expect(
      result.current.reviewerShares.map((s) => [s.reviewerName, s.percent]),
    ).toEqual([
      ["Ana Reyes", 33],
      ["Ben Cruz", 33],
      ["Cora Lim", 33],
    ]);
    expect(
      result.current.declineReasonShares.map((s) => [s.key, s.percent]),
    ).toEqual([
      ["inaccurateSpecies", 60],
      ["lowQualityPhoto", 40],
    ]);
  });

  it("names reviewers without a profile", async () => {
    const data = testAnalyticsData("30d");
    fetchAnalyticsDataMock.mockResolvedValue({
      ...data,
      reviewerNames: new Map(),
    });
    const { result } = renderViewModel();

    // Still one slice per reviewer, each with the fallback name.
    await waitFor(() => {
      expect(result.current.reviewerShares).toHaveLength(3);
    });
    result.current.reviewerShares.forEach((share) => {
      expect(share.reviewerName).toBe(
        AppStrings.analytics.moderation.unknownReviewer,
      );
    });
    expect(
      new Set(result.current.reviewerShares.map((s) => s.reviewerId)).size,
    ).toBe(3);
  });
});
