import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getActiveRate } from "../../users/models/adminUser";
import { fetchUserStats } from "../../users/services/usersService";
import {
  getAvailableGranularities,
  resolveGranularity,
  summarizeReviewOutcomes,
  type AnalyticsRange,
  type TrendGranularity,
} from "../models/analytics";
import {
  fetchPostTrend,
  fetchReviewOutcomes,
} from "../services/analyticsService";
import { toCardQueryState } from "./cardQueryState";

/**
 * Overview tab: user stats (shared with User Management), posts over time
 * at the chosen granularity, and review outcomes for the range.
 */
export function useOverviewViewModel(range: AnalyticsRange) {
  const [requestedGranularity, setRequestedGranularity] =
    useState<TrendGranularity | null>(null);
  const granularity = resolveGranularity(range, requestedGranularity);

  // Same key as User Management, so the two screens share the cache.
  const statsQuery = useQuery({
    queryKey: ["users", "stats"],
    queryFn: fetchUserStats,
  });

  const trendQuery = useQuery({
    queryKey: ["analytics", "postTrend", range, granularity],
    queryFn: () => fetchPostTrend(range, granularity),
    placeholderData: keepPreviousData,
  });

  const outcomesQuery = useQuery({
    queryKey: ["analytics", "reviewOutcomes", range],
    queryFn: () => fetchReviewOutcomes(range),
    placeholderData: keepPreviousData,
  });

  return {
    userStats: statsQuery.data,
    activeRate: statsQuery.data ? getActiveRate(statsQuery.data) : 0,
    granularity,
    availableGranularities: getAvailableGranularities(range),
    changeGranularity: setRequestedGranularity,
    trend: trendQuery.data ?? [],
    trendState: toCardQueryState(trendQuery),
    outcomes: outcomesQuery.data
      ? summarizeReviewOutcomes(outcomesQuery.data)
      : undefined,
    outcomesState: toCardQueryState(outcomesQuery),
  };
}

export type OverviewViewModel = ReturnType<typeof useOverviewViewModel>;
