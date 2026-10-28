import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper } from "../../../test/queryWrapper";
import { testUsers } from "../../../test/fixtures/users";
import {
  fetchSanctionsSince,
  fetchUsers,
} from "../../users/services/usersService";
import type { AnalyticsRange } from "../models/analytics";
import {
  fetchPostTrend,
  fetchReviewOutcomes,
} from "../services/analyticsService";
import { mockPostTrend, mockReviewOutcomes } from "../services/mockAnalytics";
import { useOverviewViewModel } from "./useOverviewViewModel";

vi.mock("../services/analyticsService", () => ({
  fetchPostTrend: vi.fn(),
  fetchReviewOutcomes: vi.fn(),
}));

vi.mock("../../users/services/usersService", () => ({
  fetchUsers: vi.fn(),
  fetchSanctionsSince: vi.fn(),
}));

const fetchPostTrendMock = vi.mocked(fetchPostTrend);
const fetchReviewOutcomesMock = vi.mocked(fetchReviewOutcomes);
const now = new Date("2026-10-30T00:00:00Z");

function renderViewModel(range: AnalyticsRange = "30d") {
  return renderHook(({ range }) => useOverviewViewModel(range), {
    initialProps: { range },
    wrapper: createQueryWrapper(),
  });
}

describe("useOverviewViewModel", () => {
  beforeEach(() => {
    fetchPostTrendMock.mockReset();
    fetchReviewOutcomesMock.mockReset();
    vi.mocked(fetchUsers).mockResolvedValue([...testUsers]);
    vi.mocked(fetchSanctionsSince).mockResolvedValue([]);
    fetchPostTrendMock.mockImplementation((range, granularity) =>
      Promise.resolve(mockPostTrend(range, granularity, now)),
    );
    fetchReviewOutcomesMock.mockImplementation((range) =>
      Promise.resolve(mockReviewOutcomes(range)),
    );
  });

  it("loads user stats, the weekly trend, and review outcomes", async () => {
    const { result } = renderViewModel();
    expect(result.current.trendState.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.trendState.isLoading).toBe(false);
    });
    expect(result.current.granularity).toBe("weekly");
    expect(fetchPostTrendMock).toHaveBeenCalledWith("30d", "weekly");
    expect(result.current.trend).toHaveLength(4);

    await waitFor(() => {
      expect(result.current.outcomes?.total).toBe(3842);
    });
    expect(result.current.outcomes?.approvalPercent).toBe(89.1);
    await waitFor(() => {
      expect(result.current.userStats?.totalUsers).toBe(24);
    });
    expect(result.current.activeRate).toBe(91.7);
  });

  it("refetches at a new granularity", async () => {
    const { result } = renderViewModel();
    await waitFor(() => {
      expect(result.current.trendState.isLoading).toBe(false);
    });

    act(() => {
      result.current.changeGranularity("daily");
    });

    await waitFor(() => {
      expect(result.current.trend).toHaveLength(30);
    });
    expect(fetchPostTrendMock).toHaveBeenLastCalledWith("30d", "daily");
  });

  it("falls back to the range's default when the granularity isn't offered", async () => {
    const { result, rerender } = renderViewModel();
    act(() => {
      result.current.changeGranularity("weekly");
    });

    rerender({ range: "7d" });

    expect(result.current.granularity).toBe("daily");
    expect(result.current.availableGranularities).toEqual(["daily"]);
    await waitFor(() => {
      expect(fetchPostTrendMock).toHaveBeenLastCalledWith("7d", "daily");
    });
  });

  it("reports a trend error and retries", async () => {
    fetchPostTrendMock.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderViewModel();

    await waitFor(() => {
      expect(result.current.trendState.isError).toBe(true);
    });
    act(() => {
      result.current.trendState.retry();
    });
    await waitFor(() => {
      expect(result.current.trend).toHaveLength(4);
    });
  });
});
