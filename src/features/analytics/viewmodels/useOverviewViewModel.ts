import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useUserStats } from "../../users/viewmodels/userQueries";
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

  // Shares its queries with User Management.
  const { stats: userStats, activeRate } = useUserStats();

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
    userStats,
    activeRate,
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
