import type {
  AnalyticsRange,
  ContributorStats,
  HotspotCategoryFilter,
  InvasiveAlert,
  ModerationActivity,
  PostTrendPoint,
  ReviewOutcomeCounts,
  SightingHotspot,
  SpeciesBreakdown,
  TrendGranularity,
} from "../models/analytics";
import {
  mockHotspots,
  mockInvasiveAlerts,
  mockModerationActivity,
  mockPostTrend,
  mockReviewOutcomes,
  mockSpeciesBreakdown,
  mockTopContributors,
} from "./mockAnalytics";

/**
 * Analytics Service: one function per widget, each returning raw counts
 * for the selected date range. Percentages, shares, and levels are derived
 * in the Model, so these only need to supply counts.
 *
 * TODO(schema): Currently serves in-memory mock data. Replace each body
 * with a Supabase query (ideally aggregate views or RPCs filtered by the
 * range's start date) once the reports schema, its moderation status,
 * reviewer, decline-reason, and invasive-threat fields, and the admin RLS
 * policies are defined by the mobile app/backend. Map rows to the Models
 * here; the signatures can stay the same.
 */

const mockLatencyMs = 300;

function withMockLatency<T>(value: T): Promise<T> {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve(value);
    }, mockLatencyMs),
  );
}

/** Submitted, approved, and declined posts per period, oldest first. */
export function fetchPostTrend(
  range: AnalyticsRange,
  granularity: TrendGranularity,
): Promise<PostTrendPoint[]> {
  return withMockLatency(mockPostTrend(range, granularity, new Date()));
}

export function fetchReviewOutcomes(
  range: AnalyticsRange,
): Promise<ReviewOutcomeCounts> {
  return withMockLatency(mockReviewOutcomes(range));
}

export function fetchSpeciesBreakdown(
  range: AnalyticsRange,
): Promise<SpeciesBreakdown> {
  return withMockLatency(mockSpeciesBreakdown(range));
}

/** Sightings per conservation sector, optionally for one species category. */
export function fetchHotspots(
  range: AnalyticsRange,
  category: HotspotCategoryFilter,
): Promise<SightingHotspot[]> {
  return withMockLatency(mockHotspots(range, category));
}

/** Invasive-species reports in the range, newest first. */
export function fetchInvasiveAlerts(
  range: AnalyticsRange,
): Promise<InvasiveAlert[]> {
  return withMockLatency(mockInvasiveAlerts(range, new Date()));
}

export const topContributorLimit = 5;

/** Contributors with the most submissions in the range, busiest first. */
export function fetchTopContributors(
  range: AnalyticsRange,
): Promise<ContributorStats[]> {
  return withMockLatency(mockTopContributors(range, topContributorLimit));
}

export function fetchModerationActivity(
  range: AnalyticsRange,
): Promise<ModerationActivity> {
  return withMockLatency(mockModerationActivity(range));
}
