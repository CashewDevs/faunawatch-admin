/**
 * Analytics domain model: the tabs and date ranges of the Analytics screen,
 * the raw report and review records loaded for a range, the shape of each
 * widget's data, and pure helpers that derive every count, percentage,
 * share, and level from those records.
 *
 * The Service loads a range's reports and reviews once and every card is
 * worked out here, so figures on different tabs always agree.
 */

import {
  reportCategories,
  type AiSpeciesMatch,
  type Filter,
  type KnownPostStatus,
  type PostSeverity,
  type PostStatus,
  type ReportCategory,
} from "../../post-review/models/post";
import {
  declineReasons,
  type DeclineReason,
  type ReviewDecision,
} from "../../post-review/models/moderation";

// Decline reasons are defined with the decisions that use them.
export {
  declineReasons,
  toDeclineReason,
  type DeclineReason,
  type ReviewDecision,
} from "../../post-review/models/moderation";

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

const dayMs = 86_400_000;

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Midnight UTC on the range's first day; the range ends at `now`. */
export function getRangeStart(range: AnalyticsRange, now: Date): Date {
  return new Date(startOfUtcDay(now) - (rangeDays[range] - 1) * dayMs);
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

/** The middle value (mean of the middle two); null for no values. */
export function getMedian(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? 0;
  return sorted.length % 2 === 1
    ? upper
    : ((sorted[middle - 1] ?? 0) + upper) / 2;
}

function countBy<T extends string>(
  keys: readonly T[],
  values: readonly T[],
): Record<T, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<
    T,
    number
  >;
  values.forEach((value) => {
    counts[value] += 1;
  });
  return counts;
}

// ── Raw records ──────────────────────────────────────────────

/** A report submitted in the selected range. */
export interface AnalyticsReport {
  id: string;
  /** ISO 8601 date-time. */
  submittedAt: string;
  category: ReportCategory;
  status: PostStatus;
  severity: PostSeverity;
  isInvasive: boolean;
  /** The AI's top species; null without a completed analysis. */
  species: AiSpeciesMatch | null;
  reporter: {
    id: string;
    /** Best available name; empty when none. */
    fullName: string;
    username: string | null;
  };
  /** First photo in the private `report-images` bucket. */
  coverPhotoPath: string | null;
  /** When the report was first approved or declined; null while pending. */
  firstDecidedAt: string | null;
}

/** A moderation decision made in the selected range. */
export interface AnalyticsReview {
  reportId: string;
  decision: ReviewDecision;
  /** Set for declines. */
  declineReason: DeclineReason | null;
  /** Null when the reviewing admin's account has since been deleted. */
  reviewerId: string | null;
  /** ISO 8601 date-time. */
  decidedAt: string;
}

/**
 * Each report's latest decision. A re-reviewed report then counts once,
 * with the outcome it has now.
 */
export function getLatestReviews(
  reviews: readonly AnalyticsReview[],
): AnalyticsReview[] {
  const latest = new Map<string, AnalyticsReview>();
  reviews.forEach((review) => {
    const current = latest.get(review.reportId);
    if (!current || review.decidedAt > current.decidedAt) {
      latest.set(review.reportId, review);
    }
  });
  return [...latest.values()];
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
  const endDay = startOfUtcDay(end);
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

/**
 * Reports submitted, and reports approved or declined (at their latest
 * decision), per period. Events before the first whole period are left out.
 */
export function getPostTrend(
  reports: readonly AnalyticsReport[],
  reviews: readonly AnalyticsReview[],
  range: AnalyticsRange,
  granularity: TrendGranularity,
  now: Date,
): PostTrendPoint[] {
  const starts = getTrendPeriodStarts(range, granularity, now);
  const points: PostTrendPoint[] = starts.map((periodStart) => ({
    periodStart,
    submitted: 0,
    approved: 0,
    declined: 0,
  }));
  const pointFor = (isoDateTime: string) => {
    const day = toIsoDate(new Date(isoDateTime));
    let index = -1;
    starts.forEach((start, position) => {
      if (start <= day) index = position;
    });
    return points[index];
  };

  reports.forEach((report) => {
    const point = pointFor(report.submittedAt);
    if (point) point.submitted += 1;
  });
  getLatestReviews(reviews).forEach((review) => {
    const point = pointFor(review.decidedAt);
    if (point) point[review.decision] += 1;
  });
  return points;
}

// ── Overview: review outcomes ────────────────────────────────

export interface ReviewOutcomeCounts {
  approved: number;
  declined: number;
  /** Submitted in the range and still waiting for a decision. */
  awaitingTriage: number;
  /** Sent back to the reporter and waiting for their changes. */
  changesRequested: number;
}

export type ReviewOutcome = keyof ReviewOutcomeCounts;

export const reviewOutcomes: readonly ReviewOutcome[] = [
  "approved",
  "declined",
  "awaitingTriage",
  "changesRequested",
];

/**
 * Reports submitted in the range, by their current review status. A status
 * this site doesn't know ("unknown") is left out rather than counted as
 * awaiting review.
 */
export function getReviewOutcomeCounts(
  reports: readonly AnalyticsReport[],
): ReviewOutcomeCounts {
  const counts = countBy<KnownPostStatus>(
    ["pending", "changes_requested", "approved", "declined"],
    reports.flatMap((report) =>
      report.status === "unknown" ? [] : [report.status],
    ),
  );
  return {
    approved: counts.approved,
    declined: counts.declined,
    awaitingTriage: counts.pending,
    changesRequested: counts.changes_requested,
  };
}

export interface ReviewOutcomeSummary {
  /** Every post counted, decided or not. */
  total: number;
  /** Approved as a share of decided posts (approved + declined). */
  approvalPercent: number;
  shares: Share<ReviewOutcome>[];
}

/**
 * The Changes requested bucket is shown when Request changes is switched on,
 * or whenever it has posts (a request can outlive the switch). It is hidden
 * only when the switch is off and it is empty. Whenever it is shown it is in
 * the shares and the total, so the total always equals every counted post;
 * those posts never count as awaiting review.
 */
export function summarizeReviewOutcomes(
  counts: ReviewOutcomeCounts,
  isRequestChangesEnabled: boolean,
): ReviewOutcomeSummary {
  const showChangesRequested =
    isRequestChangesEnabled || counts.changesRequested > 0;
  const shown = showChangesRequested
    ? reviewOutcomes
    : reviewOutcomes.filter((outcome) => outcome !== "changesRequested");
  return {
    total: shown.reduce((sum, outcome) => sum + counts[outcome], 0),
    approvalPercent: toPercent(
      counts.approved,
      counts.approved + counts.declined,
      1,
    ),
    shares: toShares(counts, shown, 1),
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
  categoryCounts: Record<ReportCategory, number>;
  severity: Record<PostSeverity, SeverityStats>;
}

/** How many species the Top Reported Species card lists. */
export const topSpeciesLimit = 8;

/** Display order of the severity tiers, mildest first, then unrated. */
export const severityOrder: readonly PostSeverity[] = [
  "low",
  "medium",
  "high",
  "unrated",
];

/**
 * Top species (the AI's top match, grouped case-insensitively), reports
 * per category, and each severity tier's size and median review time.
 */
export function getSpeciesBreakdown(
  reports: readonly AnalyticsReport[],
): SpeciesBreakdown {
  const species = new Map<string, SpeciesCount>();
  reports.forEach((report) => {
    if (!report.species) return;
    const key = report.species.commonName.toLowerCase();
    const entry = species.get(key);
    if (entry) entry.count += 1;
    else species.set(key, { commonName: report.species.commonName, count: 1 });
  });

  const severityStats = (tier: PostSeverity): SeverityStats => {
    const inTier = reports.filter((report) => report.severity === tier);
    const reviewMinutes = inTier.flatMap((report) =>
      report.firstDecidedAt
        ? [
            (new Date(report.firstDecidedAt).getTime() -
              new Date(report.submittedAt).getTime()) /
              60_000,
          ]
        : [],
    );
    return {
      count: inTier.length,
      medianReviewMinutes: getMedian(reviewMinutes),
    };
  };

  return {
    topSpecies: [...species.values()]
      .sort(
        (a, b) => b.count - a.count || a.commonName.localeCompare(b.commonName),
      )
      .slice(0, topSpeciesLimit),
    categoryCounts: countBy(
      reportCategories,
      reports.map((report) => report.category),
    ),
    severity: {
      low: severityStats("low"),
      medium: severityStats("medium"),
      high: severityStats("high"),
      unrated: severityStats("unrated"),
    },
  };
}

export function getSeverityShares(
  severity: Record<PostSeverity, SeverityStats>,
): Share<PostSeverity>[] {
  return toShares(
    {
      low: severity.low.count,
      medium: severity.medium.count,
      high: severity.high.count,
      unrated: severity.unrated.count,
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

/** One grid cell from `admin_sector_stats()`. */
export interface SectorCell {
  /** Centre of the cell. */
  latitude: number;
  longitude: number;
  reportCount: number;
  categoryCounts: Partial<Record<ReportCategory, number>>;
}

export interface SightingHotspot {
  id: string;
  /** The cell's centre as text, e.g. "7.05°N, 125.25°E". */
  name: string;
  /**
   * Centre of a grid cell. Never an individual sighting's coordinates,
   * so endangered-species locations aren't exposed.
   */
  latitude: number;
  longitude: number;
  sightingCount: number;
}

export type HotspotCategoryFilter = Filter<ReportCategory>;

/** (7.05, 125.25) → "7.05°N, 125.25°E" */
export function formatCellName(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(2)}°${latitude < 0 ? "S" : "N"}`;
  const lng = `${Math.abs(longitude).toFixed(2)}°${longitude < 0 ? "W" : "E"}`;
  return `${lat}, ${lng}`;
}

/** Each cell's report count, for every category or just one. */
export function toSightingHotspots(
  cells: readonly SectorCell[],
  category: HotspotCategoryFilter,
): SightingHotspot[] {
  return cells.map((cell) => {
    const name = formatCellName(cell.latitude, cell.longitude);
    return {
      id: name,
      name,
      latitude: cell.latitude,
      longitude: cell.longitude,
      sightingCount:
        category === "all"
          ? cell.reportCount
          : (cell.categoryCounts[category] ?? 0),
    };
  });
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

export interface InvasiveAlert {
  id: string;
  category: ReportCategory;
  /** The AI's species; null when it named none. */
  commonName: string | null;
  /** Empty when the AI gave none. */
  scientificName: string;
  /** ISO 8601 date-time the report was submitted. */
  reportedAt: string;
  photoPath: string | null;
  /** Signed URL; null until signed, or when it can't be. */
  photoUrl: string | null;
}

/** How many of the newest invasive reports the alerts card lists. */
export const invasiveAlertLimit = 10;

/**
 * Reports the AI flagged as possibly invasive: how many in the range, and
 * the newest few (photos not yet signed).
 */
export function getInvasiveAlerts(reports: readonly AnalyticsReport[]): {
  total: number;
  alerts: InvasiveAlert[];
} {
  const invasive = reports
    .filter((report) => report.isInvasive)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return {
    total: invasive.length,
    alerts: invasive.slice(0, invasiveAlertLimit).map((report) => ({
      id: report.id,
      category: report.category,
      commonName: report.species?.commonName ?? null,
      scientificName: report.species?.scientificName ?? "",
      reportedAt: report.submittedAt,
      photoPath: report.coverPhotoPath,
      photoUrl: null,
    })),
  };
}

// ── Contributors & moderation ────────────────────────────────

export interface ContributorStats {
  id: string;
  fullName: string;
  username: string | null;
  submissions: number;
  approved: number;
  declined: number;
}

export const topContributorLimit = 5;

/**
 * Reporters with the most reports submitted in the range, busiest first;
 * approved and declined count those reports' current status.
 */
export function getTopContributors(
  reports: readonly AnalyticsReport[],
): ContributorStats[] {
  const contributors = new Map<string, ContributorStats>();
  reports.forEach((report) => {
    const stats = contributors.get(report.reporter.id) ?? {
      ...report.reporter,
      submissions: 0,
      approved: 0,
      declined: 0,
    };
    stats.submissions += 1;
    if (report.status === "approved") stats.approved += 1;
    if (report.status === "declined") stats.declined += 1;
    contributors.set(report.reporter.id, stats);
  });
  return [...contributors.values()]
    .sort(
      (a, b) =>
        b.submissions - a.submissions || a.fullName.localeCompare(b.fullName),
    )
    .slice(0, topContributorLimit);
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
  reviewerId: string;
  reviewerName: string;
  decisions: number;
}

export interface ModerationActivity {
  reviewers: ReviewerDecisions[];
  declineReasonCounts: Record<DeclineReason, number>;
}

/**
 * Groups decisions made by admins whose accounts were deleted. Real
 * reviewer ids are UUIDs, so this can't clash with one.
 */
export const formerReviewerId = "former-reviewer";

export interface ReviewerFallbackNames {
  /** A reviewer with no name on their profile. */
  unknown: string;
  /** A reviewer whose account was deleted. */
  former: string;
}

/**
 * Decisions per reviewer (every decision counts as work done), and the
 * reasons behind reports whose latest decision is a decline.
 */
export function getModerationActivity(
  reviews: readonly AnalyticsReview[],
  reviewerNames: ReadonlyMap<string, string>,
  fallbackNames: ReviewerFallbackNames,
): ModerationActivity {
  const reviewers = new Map<string, ReviewerDecisions>();
  reviews.forEach(({ reviewerId }) => {
    const id = reviewerId ?? formerReviewerId;
    const entry = reviewers.get(id) ?? {
      reviewerId: id,
      reviewerName:
        reviewerId === null
          ? fallbackNames.former
          : (reviewerNames.get(reviewerId) ?? fallbackNames.unknown),
      decisions: 0,
    };
    entry.decisions += 1;
    reviewers.set(id, entry);
  });
  return {
    reviewers: [...reviewers.values()],
    declineReasonCounts: countBy(
      declineReasons,
      getLatestReviews(reviews).flatMap((review) =>
        review.decision === "declined" && review.declineReason
          ? [review.declineReason]
          : [],
      ),
    ),
  };
}

/** Reviewers shown by name; the rest fold into "Others". */
export const namedReviewerLimit = 3;

export interface ReviewerShare {
  /** Null for the folded "Others" slice. */
  reviewerId: string | null;
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
    .sort(
      (a, b) =>
        b.decisions - a.decisions ||
        a.reviewerName.localeCompare(b.reviewerName),
    );
  const named = sorted.slice(0, namedReviewerLimit);
  const others = sorted
    .slice(namedReviewerLimit)
    .reduce((sum, r) => sum + r.decisions, 0);

  const shares: ReviewerShare[] = named.map((reviewer) => ({
    reviewerId: reviewer.reviewerId,
    reviewerName: reviewer.reviewerName,
    decisions: reviewer.decisions,
    percent: toPercent(reviewer.decisions, total),
  }));
  if (others > 0) {
    shares.push({
      reviewerId: null,
      reviewerName: null,
      decisions: others,
      percent: toPercent(others, total),
    });
  }
  return shares;
}
