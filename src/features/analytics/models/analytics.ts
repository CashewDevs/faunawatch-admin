/**
 * Analytics domain model: the tabs and date ranges of the Analytics screen,
 * the shape of each widget's data, and pure helpers that derive every
 * percentage, share, and level from raw counts.
 *
 * Services only ever return raw counts, so real data drops in without any
 * View or ViewModel changes and the derived figures always agree.
 *
 * TODO(schema): These are the admin site's presentation shapes, not database
 * columns. The mobile app/backend owns the reports schema; map Supabase rows
 * (or aggregate views / RPCs) to these shapes in the analytics Service.
 */

import type {
  Filter,
  PostSeverity,
  SpeciesCategory,
} from "../../post-review/models/post";

// ── Screen state ─────────────────────────────────────────────

export type AnalyticsTab = "overview" | "species" | "hotspots" | "moderation";

export type AnalyticsRange = "7d" | "30d" | "90d" | "12m";

export interface AnalyticsView {
  tab: AnalyticsTab;
  range: AnalyticsRange;
}

export const analyticsTabs: readonly AnalyticsTab[] = [
  "overview",
  "species",
  "hotspots",
  "moderation",
];

export const analyticsRanges: readonly AnalyticsRange[] = [
  "7d",
  "30d",
  "90d",
  "12m",
];

export const defaultAnalyticsView: AnalyticsView = {
  tab: "overview",
  range: "30d",
};

/** Days covered by each range, ending today. */
export const rangeDays: Record<AnalyticsRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "12m": 365,
};

function pickOption<T extends string>(
  value: string | null,
  options: readonly T[],
  fallback: T,
): T {
  return options.find((option) => option === value) ?? fallback;
}

/** Reads the tab and range from URL search params; invalid values fall back. */
export function parseAnalyticsParams(params: URLSearchParams): AnalyticsView {
  return {
    tab: pickOption(params.get("tab"), analyticsTabs, defaultAnalyticsView.tab),
    range: pickOption(
      params.get("range"),
      analyticsRanges,
      defaultAnalyticsView.range,
    ),
  };
}

/** Writes the tab and range to URL search params, leaving out defaults. */
export function toAnalyticsParams(view: AnalyticsView): URLSearchParams {
  const params = new URLSearchParams();
  if (view.tab !== defaultAnalyticsView.tab) params.set("tab", view.tab);
  if (view.range !== defaultAnalyticsView.range) {
    params.set("range", view.range);
  }
  return params;
}

// ── Shared helpers ───────────────────────────────────────────

/** `part` as a percentage of `total`, rounded; 0 when the total is 0. */
export function toPercent(part: number, total: number, decimals = 0): number {
  if (total <= 0) return 0;
  const factor = 10 ** decimals;
  return Math.round((part / total) * 100 * factor) / factor;
}

export interface Share<T> {
  key: T;
  count: number;
  /** Share of the total, 0–100. */
  percent: number;
}

/** Each key's count and share of the total, in the given order. */
export function toShares<T extends string>(
  counts: Record<T, number>,
  order: readonly T[],
  decimals = 0,
): Share<T>[] {
  const total = order.reduce((sum, key) => sum + counts[key], 0);
  return order.map((key) => ({
    key,
    count: counts[key],
    percent: toPercent(counts[key], total, decimals),
  }));
}

/** Bar length for `count` against the largest value, 0–100. */
export function getBarPercent(count: number, maxCount: number): number {
  if (maxCount <= 0) return 0;
  return Math.min(100, Math.max(0, (count / maxCount) * 100));
}

// ── Overview: posts over time ────────────────────────────────

export type TrendGranularity = "daily" | "weekly" | "monthly";

export const trendGranularities: readonly TrendGranularity[] = [
  "daily",
  "weekly",
  "monthly",
];

export interface PostTrendPoint {
  /** First day of the period, as an ISO date ("2026-10-01"). */
  periodStart: string;
  submitted: number;
  approved: number;
  declined: number;
}

export type TrendSeries = Exclude<keyof PostTrendPoint, "periodStart">;

export const trendSeries: readonly TrendSeries[] = [
  "submitted",
  "approved",
  "declined",
];

const availableGranularities: Record<
  AnalyticsRange,
  readonly TrendGranularity[]
> = {
  "7d": ["daily"],
  "30d": ["daily", "weekly"],
  "90d": ["daily", "weekly"],
  "12m": ["weekly", "monthly"],
};

const defaultGranularity: Record<AnalyticsRange, TrendGranularity> = {
  "7d": "daily",
  "30d": "weekly",
  "90d": "weekly",
  "12m": "monthly",
};

/** Granularities that give a readable number of points for the range. */
export function getAvailableGranularities(
  range: AnalyticsRange,
): readonly TrendGranularity[] {
  return availableGranularities[range];
}

/** The requested granularity if the range allows it, else the range's default. */
export function resolveGranularity(
  range: AnalyticsRange,
  requested: TrendGranularity | null,
): TrendGranularity {
  return requested && availableGranularities[range].includes(requested)
    ? requested
    : defaultGranularity[range];
}

const dayMs = 86_400_000;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * ISO start dates of every period in the range ending on `end` (UTC):
 * each day, each whole 7-day week ending on `end`, or each whole calendar
 * month (the current month counts even though it isn't over yet).
 */
export function getTrendPeriodStarts(
  range: AnalyticsRange,
  granularity: TrendGranularity,
  end: Date,
): string[] {
  const endDay = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  );
  const startDay = endDay - (rangeDays[range] - 1) * dayMs;

  if (granularity === "monthly") {
    const starts: string[] = [];
    const cursor = new Date(startDay);
    cursor.setUTCDate(1);
    // Skip a partial first month so every point covers a whole month.
    if (cursor.getTime() < startDay)
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    while (cursor.getTime() <= endDay) {
      starts.push(toIsoDate(cursor));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return starts;
  }

  // Count back from the end so the latest point is a whole period and a
  // leftover partial period at the start is dropped.
  const stepMs = (granularity === "weekly" ? 7 : 1) * dayMs;
  const starts: string[] = [];
  for (let day = endDay - stepMs + dayMs; day >= startDay; day -= stepMs) {
    starts.unshift(toIsoDate(new Date(day)));
  }
  return starts;
}

// ── Overview: review outcomes ────────────────────────────────

export interface ReviewOutcomeCounts {
  approved: number;
  declined: number;
  /** Submitted in the range and still waiting for a decision. */
  awaitingTriage: number;
}

export type ReviewOutcome = keyof ReviewOutcomeCounts;

export const reviewOutcomes: readonly ReviewOutcome[] = [
  "approved",
  "declined",
  "awaitingTriage",
];

export interface ReviewOutcomeSummary {
  /** Every post counted, decided or not. */
  total: number;
  /** Approved as a share of decided posts (approved + declined). */
  approvalPercent: number;
  shares: Share<ReviewOutcome>[];
}

export function summarizeReviewOutcomes(
  counts: ReviewOutcomeCounts,
): ReviewOutcomeSummary {
  return {
    total: counts.approved + counts.declined + counts.awaitingTriage,
    approvalPercent: toPercent(
      counts.approved,
      counts.approved + counts.declined,
      1,
    ),
    shares: toShares(counts, reviewOutcomes, 1),
  };
}

// ── Species & severity ───────────────────────────────────────

export interface SpeciesCount {
  commonName: string;
  count: number;
}

export interface SeverityStats {
  count: number;
  /** Median minutes from submission to a decision, or null when unknown. */
  medianReviewMinutes: number | null;
}

export interface SpeciesBreakdown {
  /** Most-reported species, largest first. */
  topSpecies: SpeciesCount[];
  categoryCounts: Record<SpeciesCategory, number>;
  severity: Record<PostSeverity, SeverityStats>;
}

/** Display order of the severity tiers, mildest first. */
export const severityOrder: readonly PostSeverity[] = ["low", "medium", "high"];

export function getSeverityShares(
  severity: Record<PostSeverity, SeverityStats>,
): Share<PostSeverity>[] {
  return toShares(
    {
      low: severity.low.count,
      medium: severity.medium.count,
      high: severity.high.count,
    },
    severityOrder,
  );
}

/** 25 → "~25m", 324 → "~5.4h". */
export function formatReviewTime(minutes: number): string {
  if (minutes < 60) return `~${String(Math.round(minutes))}m`;
  return `~${String(Math.round(minutes / 6) / 10)}h`;
}

// ── Hotspots & invasives ─────────────────────────────────────

export interface SightingHotspot {
  id: string;
  /** Conservation sector name, e.g. "Mt. Apo Sector". */
  name: string;
  /**
   * Coarse sector centroid. Never an individual sighting's coordinates,
   * so endangered-species locations aren't exposed.
   */
  latitude: number;
  longitude: number;
  sightingCount: number;
}

export type DensityLevel = "low" | "moderate" | "high" | "critical";

export const densityLevels: readonly DensityLevel[] = [
  "low",
  "moderate",
  "high",
  "critical",
];

/** Density tier from the hotspot's count relative to the busiest one. */
export function getDensityLevel(count: number, maxCount: number): DensityLevel {
  const ratio = maxCount > 0 ? count / maxCount : 0;
  if (ratio >= 0.75) return "critical";
  if (ratio >= 0.5) return "high";
  if (ratio >= 0.25) return "moderate";
  return "low";
}

/** Bounding box of the Philippines, for placing hotspots on the panel. */
const philippineBounds = {
  north: 21.2,
  south: 4.5,
  west: 116.8,
  east: 126.7,
};

/** Keeps markers off the panel edges, in percent. */
const panelInsetPercent = 10;

/**
 * Position of a coordinate on the hotspot panel, as left/top percentages.
 * The panel is a schematic, not a map, so each axis is scaled to fill it.
 */
export function projectToPanel(
  latitude: number,
  longitude: number,
): { leftPercent: number; topPercent: number } {
  const { north, south, west, east } = philippineBounds;
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  const usable = 100 - panelInsetPercent * 2;
  return {
    leftPercent:
      panelInsetPercent + clamp((longitude - west) / (east - west)) * usable,
    topPercent:
      panelInsetPercent + clamp((north - latitude) / (north - south)) * usable,
  };
}

export interface PlacedHotspot extends SightingHotspot {
  density: DensityLevel;
  leftPercent: number;
  topPercent: number;
  /** Whether the name is shown on the panel (busiest few only). */
  isLabelled: boolean;
}

/** How many of the busiest hotspots get a visible label. */
export const labelledHotspotCount = 2;

export function placeHotspots(
  hotspots: readonly SightingHotspot[],
): PlacedHotspot[] {
  const maxCount = Math.max(0, ...hotspots.map((h) => h.sightingCount));
  const labelledIds = new Set(
    [...hotspots]
      .filter((hotspot) => hotspot.sightingCount > 0)
      .sort((a, b) => b.sightingCount - a.sightingCount)
      .slice(0, labelledHotspotCount)
      .map((hotspot) => hotspot.id),
  );
  return hotspots
    .filter((hotspot) => hotspot.sightingCount > 0)
    .map((hotspot) => ({
      ...hotspot,
      ...projectToPanel(hotspot.latitude, hotspot.longitude),
      density: getDensityLevel(hotspot.sightingCount, maxCount),
      isLabelled: labelledIds.has(hotspot.id),
    }));
}

export type HotspotCategoryFilter = Filter<SpeciesCategory>;

export type InvasiveThreat = "colony" | "aquatic" | "ecosystem" | "biosecurity";

export interface InvasiveAlert {
  id: string;
  commonName: string;
  scientificName: string;
  locationName: string;
  /** ISO date the report was submitted ("2026-10-24"). */
  reportedOn: string;
  threat: InvasiveThreat;
  photoUrl: string | null;
}

// ── Contributors & moderation ────────────────────────────────

export interface ContributorStats {
  id: string;
  fullName: string;
  username: string;
  submissions: number;
  approved: number;
  declined: number;
}

/** Approved as a whole-number share of decided posts. */
export function getContributorApprovalRate(
  contributor: ContributorStats,
): number {
  return toPercent(
    contributor.approved,
    contributor.approved + contributor.declined,
  );
}

export interface ReviewerDecisions {
  reviewerName: string;
  decisions: number;
}

export type DeclineReason =
  | "inaccurateSpecies"
  | "lowQualityPhoto"
  | "domesticSpecimen"
  | "duplicateSighting"
  | "inaccurateLocation";

export const declineReasons: readonly DeclineReason[] = [
  "inaccurateSpecies",
  "lowQualityPhoto",
  "domesticSpecimen",
  "duplicateSighting",
  "inaccurateLocation",
];

export interface ModerationActivity {
  reviewers: ReviewerDecisions[];
  declineReasonCounts: Record<DeclineReason, number>;
}

/** Reviewers shown by name; the rest fold into "Others". */
export const namedReviewerLimit = 3;

export interface ReviewerShare {
  /** Null for the folded "Others" slice. */
  reviewerName: string | null;
  decisions: number;
  percent: number;
}

/**
 * Busiest reviewers first, with everyone past the limit folded into one
 * "Others" slice so the bar never needs more than four colours.
 */
export function getReviewerShares(
  reviewers: readonly ReviewerDecisions[],
): ReviewerShare[] {
  const total = reviewers.reduce((sum, r) => sum + r.decisions, 0);
  const sorted = [...reviewers]
    .filter((reviewer) => reviewer.decisions > 0)
    .sort((a, b) => b.decisions - a.decisions);
  const named = sorted.slice(0, namedReviewerLimit);
  const others = sorted
    .slice(namedReviewerLimit)
    .reduce((sum, r) => sum + r.decisions, 0);
  const shares: ReviewerShare[] = named.map((reviewer) => ({
    reviewerName: reviewer.reviewerName,
    decisions: reviewer.decisions,
    percent: toPercent(reviewer.decisions, total),
  }));
  if (others > 0) {
    shares.push({
      reviewerName: null,
      decisions: others,
      percent: toPercent(others, total),
    });
  }
  return shares;
}
