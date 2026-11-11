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

const flag = vi.hoisted(() => ({ requestChanges: false }));

vi.mock("../../../core/constants/featureFlags", () => ({
  isRequestChangesEnabled: () => flag.requestChanges,
}));

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
    flag.requestChanges = false;
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

  it("hides an empty Changes requested bucket while the switch is off", async () => {
    const { result } = renderViewModel();
    await waitFor(() => {
      expect(result.current.outcomes).toBeDefined();
    });

    expect(result.current.outcomes?.shares.map((s) => s.key)).toEqual([
      "approved",
      "declined",
      "awaitingTriage",
    ]);
    expect(result.current.outcomes?.total).toBe(20);
  });

  it("shows posts waiting for changes with the switch off, and with it on", async () => {
    fetchAnalyticsDataMock.mockImplementation((range) => {
      const data = testAnalyticsData(range);
      const [first, ...rest] = data.reports;
      if (!first) throw new Error("Need a report");
      return Promise.resolve({
        ...data,
        reports: [{ ...first, status: "changes_requested" }, ...rest],
      });
    });

    const off = renderViewModel();
    await waitFor(() => {
      expect(off.result.current.outcomes).toBeDefined();
    });
    // Shown and in the total, though the switch is off; not under Awaiting Review.
    expect(off.result.current.outcomes?.total).toBe(20);
    expect(
      off.result.current.outcomes?.shares.find(
        (share) => share.key === "changesRequested",
      )?.count,
    ).toBe(1);
    expect(
      off.result.current.outcomes?.shares.find(
        (share) => share.key === "awaitingTriage",
      )?.count,
    ).toBe(4);

    flag.requestChanges = true;
    const on = renderViewModel();
    await waitFor(() => {
      expect(on.result.current.outcomes).toBeDefined();
    });
    expect(on.result.current.outcomes?.total).toBe(20);
    expect(
      on.result.current.outcomes?.shares.find(
        (share) => share.key === "changesRequested",
      )?.count,
    ).toBe(1);
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
