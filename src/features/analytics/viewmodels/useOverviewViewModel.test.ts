import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper } from "../../../test/queryWrapper";
import { testAnalyticsData } from "../../../test/fixtures/analytics";
import { testUserCounts } from "../../../test/fixtures/users";
import {
  fetchSanctionsSince,
  fetchUserCounts,
} from "../../users/services/usersService";
import type { AnalyticsRange } from "../models/analytics";
import { fetchAnalyticsData } from "../services/analyticsService";
import { useOverviewViewModel } from "./useOverviewViewModel";

vi.mock("../services/analyticsService", () => ({
  fetchAnalyticsData: vi.fn(),
}));

vi.mock("../../users/services/usersService", () => ({
  fetchUserCounts: vi.fn(),
  fetchSanctionsSince: vi.fn(),
}));

const fetchAnalyticsDataMock = vi.mocked(fetchAnalyticsData);

function renderViewModel(range: AnalyticsRange = "30d") {
  return renderHook(({ range }) => useOverviewViewModel(range), {
    initialProps: { range },
    wrapper: createQueryWrapper(),
  });
}

describe("useOverviewViewModel", () => {
  beforeEach(() => {
    fetchAnalyticsDataMock.mockReset();
    fetchAnalyticsDataMock.mockImplementation((range) =>
      Promise.resolve(testAnalyticsData(range)),
    );
    vi.mocked(fetchUserCounts).mockResolvedValue(testUserCounts);
    vi.mocked(fetchSanctionsSince).mockResolvedValue([]);
  });

  it("derives the weekly trend and review outcomes from the range's data", async () => {
    const { result } = renderViewModel();
    expect(result.current.trendState.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.trendState.isLoading).toBe(false);
    });

    expect(fetchAnalyticsDataMock).toHaveBeenCalledWith("30d");
    expect(result.current.granularity).toBe("weekly");
    expect(result.current.trend).toHaveLength(4);
    expect(
      result.current.trend.reduce((sum, point) => sum + point.submitted, 0),
    ).toBe(20);
    expect(result.current.outcomes?.total).toBe(20);
    expect(result.current.outcomes?.approvalPercent).toBe(66.7);
    await waitFor(() => {
      expect(result.current.userStats?.totalUsers).toBe(24);
    });
    expect(result.current.activeRate).toBe(91.7);
  });

  it("changes granularity without reloading", async () => {
    const { result } = renderViewModel();
    await waitFor(() => {
      expect(result.current.trendState.isLoading).toBe(false);
    });

    act(() => {
      result.current.changeGranularity("daily");
    });

    expect(result.current.trend).toHaveLength(30);
    expect(fetchAnalyticsDataMock).toHaveBeenCalledTimes(1);
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
      expect(result.current.outcomes?.total).toBe(7);
    });
    expect(fetchAnalyticsDataMock).toHaveBeenLastCalledWith("7d");
  });

  it("reports an error and retries", async () => {
    fetchAnalyticsDataMock.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderViewModel();

    await waitFor(() => {
      expect(result.current.trendState.isError).toBe(true);
    });
    expect(result.current.outcomesState.isError).toBe(true);

    act(() => {
      result.current.trendState.retry();
    });

    await waitFor(() => {
      expect(result.current.trend).toHaveLength(4);
    });
  });
});
