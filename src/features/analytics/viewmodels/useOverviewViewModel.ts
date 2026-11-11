import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { isRequestChangesEnabled } from "../../../core/constants/featureFlags";
import { useUserStats } from "../../users/viewmodels/userQueries";
import {
  getAvailableGranularities,
  getPostTrend,
  getReviewOutcomeCounts,
  resolveGranularity,
  summarizeReviewOutcomes,
  type AnalyticsRange,
  type TrendGranularity,
} from "../models/analytics";
import { analyticsDataQuery } from "./analyticsQueries";
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

  const dataQuery = useQuery(analyticsDataQuery(range));
  const data = dataQuery.data;

  const trend = useMemo(
    () =>
      data
        ? getPostTrend(data.reports, data.reviews, range, granularity, data.now)
        : [],
    [data, range, granularity],
  );
  const state = toCardQueryState(dataQuery);

  return {
    userStats,
    activeRate,
    granularity,
    availableGranularities: getAvailableGranularities(range),
    changeGranularity: setRequestedGranularity,
    trend,
    trendState: state,
    outcomes: data
      ? summarizeReviewOutcomes(
          getReviewOutcomeCounts(data.reports),
          isRequestChangesEnabled(),
        )
      : undefined,
    outcomesState: state,
  };
}

export type OverviewViewModel = ReturnType<typeof useOverviewViewModel>;
