import { createSignedUrls } from "../../../core/services/storageService";
import { supabase } from "../../../core/services/supabaseClient";
import { getProfileDisplayName } from "../../../core/utils/names";
import {
  parsePossibleSpecies,
  pickTopSpecies,
  reportCategories,
  toPostSeverity,
  toPostStatus,
  toReportCategory,
  type ReportCategory,
} from "../../post-review/models/post";
import {
  getRangeStart,
  toDeclineReason,
  type AnalyticsRange,
  type AnalyticsReport,
  type AnalyticsReview,
  type InvasiveAlert,
  type SectorCell,
} from "../models/analytics";

/**
 * Analytics Service: loads one date range's reports and moderation
 * decisions with their reviewers' names (every card is derived from these
 * in the Model), the per-cell counts behind the hotspot panel, and signed
 * photos for invasive alerts.
 *
 * TODO(schema): Rows are aggregated in the browser (prototype scale; a
 * range of more than 1,000 reports would hit PostgREST's default row
 * limit). At scale, move the aggregates into RPCs or views.
 *
 * The client has no generated types; the row shapes below follow the
 * faunawatch repo's migrations.
 */

interface ProfileNameRow {
  full_name: string | null;
  username: string | null;
  display_name: string | null;
}

interface ReportRow {
  id: string;
  category: string;
  status: string;
  created_at: string;
  user_id: string;
  reporter: ProfileNameRow;
  report_images: { storage_path: string; created_at: string }[];
  ai_analyses: {
    status: string;
    possible_species: unknown;
    severity: string | null;
    possible_invasive: boolean;
    created_at: string;
  }[];
  report_reviews: { decided_at: string }[];
}

interface ReviewRow {
  report_id: string;
  decision: string;
  decline_reason: string | null;
  /** Null once the deciding admin's account is deleted (on delete set null). */
  decided_by: string | null;
  decided_at: string;
  reviewer: ProfileNameRow | null;
}

/** A row from `admin_sector_stats()`. */
interface SectorRow {
  cell_lat: number;
  cell_lng: number;
  report_count: number;
  categories: unknown;
}

/** One range's raw records, loaded together so every card agrees. */
export interface AnalyticsData {
  /** When the data was loaded; the range ends here. */
  now: Date;
  reports: AnalyticsReport[];
  reviews: AnalyticsReview[];
  /** Reviewer user id → display name. */
  reviewerNames: Map<string, string>;
}

const reportColumns = [
  "id, category, status, created_at, user_id",
  "reporter:profiles!user_id(full_name, username, display_name)",
  "report_images(storage_path, created_at)",
  "ai_analyses(status, possible_species, severity, possible_invasive, created_at)",
  "report_reviews(decided_at)",
].join(", ");

const reviewColumns = [
  "report_id, decision, decline_reason, decided_by, decided_at",
  "reviewer:profiles!decided_by(full_name, username, display_name)",
].join(", ");

function displayName(row: ProfileNameRow): string {
  return (
    getProfileDisplayName(
      {
        fullName: row.full_name,
        username: row.username,
        displayName: row.display_name,
      },
      null,
    ) ?? ""
  );
}

function earliest(values: readonly string[]): string | null {
  return values.reduce<string | null>(
    (first, value) => (first === null || value < first ? value : first),
    null,
  );
}

function toAnalyticsReport(row: ReportRow): AnalyticsReport {
  // The newest completed analysis; the query already drops other rows.
  const analysis =
    row.ai_analyses
      .filter((candidate) => candidate.status === "completed")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  const cover = [...row.report_images].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  )[0];
  return {
    id: row.id,
    submittedAt: row.created_at,
    category: toReportCategory(row.category) ?? "other_wildlife_incident",
    status: toPostStatus(row.status),
    severity: toPostSeverity(analysis?.severity ?? null),
    isInvasive: analysis?.possible_invasive ?? false,
    species: analysis
      ? pickTopSpecies(parsePossibleSpecies(analysis.possible_species))
      : null,
    reporter: {
      id: row.user_id,
      fullName: displayName(row.reporter),
      username: row.reporter.username?.trim() || null,
    },
    coverPhotoPath: cover?.storage_path ?? null,
    firstDecidedAt: earliest(
      row.report_reviews.map((review) => review.decided_at),
    ),
  };
}

function toAnalyticsReview(row: ReviewRow): AnalyticsReview | null {
  if (row.decision !== "approved" && row.decision !== "declined") return null;
  return {
    reportId: row.report_id,
    decision: row.decision,
    declineReason: toDeclineReason(row.decline_reason),
    reviewerId: row.decided_by,
    decidedAt: row.decided_at,
  };
}

async function fetchReports(start: Date): Promise<AnalyticsReport[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(reportColumns)
    .gte("created_at", start.toISOString())
    .eq("ai_analyses.status", "completed")
    .order("created_at", { ascending: false })
    .overrideTypes<ReportRow[], { merge: false }>();
  if (error) throw new Error("Couldn't load reports.", { cause: error });
  return data.map(toAnalyticsReport);
}

async function fetchReviews(
  start: Date,
): Promise<Pick<AnalyticsData, "reviews" | "reviewerNames">> {
  const { data, error } = await supabase
    .from("report_reviews")
    .select(reviewColumns)
    .gte("decided_at", start.toISOString())
    .overrideTypes<ReviewRow[], { merge: false }>();
  if (error) throw new Error("Couldn't load reviews.", { cause: error });

  const reviews: AnalyticsReview[] = [];
  const reviewerNames = new Map<string, string>();
  data.forEach((row) => {
    const review = toAnalyticsReview(row);
    if (!review) return;
    reviews.push(review);
    // Deleted reviewers have no id or profile.
    const name = row.reviewer ? displayName(row.reviewer) : "";
    if (row.decided_by && name) reviewerNames.set(row.decided_by, name);
  });
  return { reviews, reviewerNames };
}

/** Reports submitted and decisions made in the range, ending now. */
export async function fetchAnalyticsData(
  range: AnalyticsRange,
): Promise<AnalyticsData> {
  const now = new Date();
  const start = getRangeStart(range, now);
  const [reports, reviewData] = await Promise.all([
    fetchReports(start),
    fetchReviews(start),
  ]);
  return { now, reports, ...reviewData };
}

function toCategoryCounts(
  value: unknown,
): Partial<Record<ReportCategory, number>> {
  if (typeof value !== "object" || value === null) return {};
  const counts: Partial<Record<ReportCategory, number>> = {};
  Object.entries(value).forEach(([key, count]) => {
    const category = reportCategories.find((option) => option === key);
    if (category && typeof count === "number") counts[category] = count;
  });
  return counts;
}

/**
 * Report counts per ~11 km grid cell (the RPC's 0.1° default), leaving out
 * cells with fewer than 3 reports so single sightings can't be pinpointed.
 */
export async function fetchSectorCells(
  range: AnalyticsRange,
): Promise<SectorCell[]> {
  const now = new Date();
  const result = await supabase.rpc("admin_sector_stats", {
    p_from_ts: getRangeStart(range, now).toISOString(),
    p_to_ts: now.toISOString(),
  });
  if (result.error) {
    throw new Error("Couldn't load hotspots.", { cause: result.error });
  }
  const data: unknown = result.data;
  const rows = (data ?? []) as SectorRow[];
  return rows.map((row) => ({
    latitude: row.cell_lat,
    longitude: row.cell_lng,
    reportCount: row.report_count,
    categoryCounts: toCategoryCounts(row.categories),
  }));
}

/**
 * Signs each alert's cover photo. Images are best-effort: one that can't
 * be signed shows its fallback.
 */
export async function signAlertPhotos(
  alerts: readonly InvasiveAlert[],
): Promise<InvasiveAlert[]> {
  const urls = await createSignedUrls(
    "report-images",
    alerts.flatMap((alert) => (alert.photoPath ? [alert.photoPath] : [])),
  );
  return alerts.map((alert) => ({
    ...alert,
    photoUrl: alert.photoPath ? (urls.get(alert.photoPath) ?? null) : null,
  }));
}
