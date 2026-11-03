import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { AnalyticsRange } from "../models/analytics";
import { fetchAnalyticsData } from "../services/analyticsService";

/**
 * One range's reports, reviews, and reviewer names. Every tab derives its
 * cards from this, so switching tabs doesn't reload anything. The previous
 * range stays on screen while a new one loads.
 */
export function analyticsDataQuery(range: AnalyticsRange) {
  return queryOptions({
    queryKey: ["analytics", "data", range],
    queryFn: () => fetchAnalyticsData(range),
    placeholderData: keepPreviousData,
  });
}
