/**
 * Post Approvals domain model: the wildlife reports the admin site reviews,
 * list query options, and pure list helpers.
 *
 * The posts Service maps `reports` rows (with their profile, photos, EXIF,
 * newest completed `ai_analyses` row and comments) to these shapes. The
 * parsers below read the AI's jsonb columns, whose agreed shapes are
 * documented in the faunawatch repo's `harden_ai_analyses` migration.
 */

import type { AvatarImage, StoredAvatar } from "../../../core/utils/avatars";
import { paginate } from "../../../core/utils/pagination";

export type PostStatus = "pending" | "approved" | "declined";

export type PostTab = PostStatus | "all";

/**
 * The severity a card shows. "unrated" covers the AI's `uncertain` and
 * reports without a completed AI analysis.
 */
export type PostSeverity = "high" | "medium" | "low" | "unrated";

/** `report_category` in the database. */
export type ReportCategory =
  | "animal_in_need"
  | "potentially_dangerous_animal"
  | "possible_invasive_species"
  | "other_wildlife_incident";

export type PostSortOption = "newest" | "oldest" | "severity";

/** Whether the identified species belongs in the Philippines. */
export type SpeciesOrigin = "endemic" | "native" | "introduced";

/** The AI's qualitative confidence; never a number. */
export type ConfidenceLabel = "high" | "medium" | "low" | "uncertain";

export type Filter<T> = "all" | T;

export interface PostReporter {
  id: string;
  /** Best available name (full name, username, …); empty when none. */
  fullName: string;
  username: string | null;
  /** Not yet signed; see `PostCardData` and `PostDetail.reporterAvatar`. */
  storedAvatar: StoredAvatar | null;
}

/** One of the AI's candidate species for the post's photos. */
export interface AiSpeciesMatch {
  commonName: string;
  /** Empty when the AI gave none. */
  scientificName: string;
  confidence: ConfidenceLabel;
}

/** What the list needs to filter, sort, search, and show a card. */
export interface PostSummary {
  id: string;
  /** Short human-facing code, e.g. "3F2A9C1B" for "Post #3F2A9C1B". */
  reference: string;
  category: ReportCategory;
  description: string;
  status: PostStatus;
  severity: PostSeverity;
  isInvasive: boolean;
  /** ISO 8601 date-time the report was submitted. */
  submittedAt: string;
  latitude: number;
  longitude: number;
  /** The area, e.g. "Lusod, Kabayan, Benguet"; null when it isn't known. */
  placeName: string | null;
  /** Paths in the private `report-images` bucket, oldest first. */
  photoPaths: readonly string[];
  /** The AI's top candidate; null without a completed AI analysis. */
  aiMatch: AiSpeciesMatch | null;
  /** The species the reporter named themselves, if any. */
  reporterSpecies: string | null;
  reporter: PostReporter;
}

/** A summary with its cover photo and reporter avatar ready to show. */
export interface PostCardData extends PostSummary {
  coverUrl: string | null;
  reporterAvatar: AvatarImage | null;
}

/** EXIF data read from one photo on the reporter's device. */
export interface PhotoExif {
  latitude: number | null;
  longitude: number | null;
  deviceMake: string | null;
  deviceModel: string | null;
  /** e.g. "f/2.8 • 1/120s • ISO 800 • 85mm". */
  cameraSettings: string | null;
  flashFired: boolean | null;
}

export interface PostPhoto {
  path: string;
  /** Signed URL; null when the photo couldn't be signed. */
  url: string | null;
  exif: PhotoExif | null;
}

/**
 * How each photo's EXIF GPS compares with the report's location:
 * every photo with GPS is close, at least one is far, or none has GPS.
 */
export type ExifLocationCheck = "verified" | "mismatch" | "noGps";

export interface PostLocation {
  latitude: number;
  longitude: number;
  /** The area, e.g. "Lusod, Kabayan, Benguet"; null when it isn't known. */
  placeName: string | null;
  elevationMeters: number | null;
  exifCheck: ExifLocationCheck;
}

export interface PostFieldNotes {
  perchHeightMeters: number | null;
  hostTree: string | null;
  /** Null when the reporter didn't say. */
  isNightObservation: boolean | null;
}

export interface PostComment {
  id: string;
  authorName: string;
  username: string | null;
  /** ISO 8601 date-time. */
  postedAt: string;
  body: string;
  isFlagged: boolean;
  moderationNote: string | null;
}

/** The reporter's track record, counted from their reports. */
export interface ReporterStats {
  totalPosts: number;
  approvedPosts: number;
  declinedPosts: number;
  /** ISO 8601 date-time the reporter's profile was created. */
  memberSince: string;
}

export interface AiChecklistItem {
  /** The stored validation label, e.g. "image_relevant". */
  key: string;
  passed: boolean;
}

/** AI-derived decision support from the newest completed analysis. */
export interface PostAiAnalysis {
  /** `visual_condition_assessment`. */
  severitySummary: string | null;
  origin: SpeciesOrigin | null;
  checklist: readonly AiChecklistItem[];
  /** `incident_summary`. */
  synthesis: string | null;
  /** `safety_recommendations`, one paragraph. */
  recommendations: string | null;
}

/** Everything the post detail screen shows. */
export interface PostDetail extends PostSummary {
  photos: readonly PostPhoto[];
  reporterAvatar: AvatarImage | null;
  /** The reporter's own notes (`user_notes`). */
  reporterNotes: string | null;
  fieldNotes: PostFieldNotes;
  location: PostLocation;
  comments: readonly PostComment[];
  reporterStats: ReporterStats;
  /** Null without a completed AI analysis. */
  ai: PostAiAnalysis | null;
}

/** Where a post sits in its status queue, for Prev / Next. */
export interface PostQueuePosition {
  /** 1-based. */
  position: number;
  total: number;
  previousId: string | null;
  nextId: string | null;
}

export interface PostListQuery {
  tab: PostTab;
  search: string;
  severity: Filter<PostSeverity>;
  category: Filter<ReportCategory>;
  sort: PostSortOption;
  /** 1-based page number. */
  page: number;
  pageSize: number;
}

export interface PostPage {
  posts: PostSummary[];
  /** Posts matching the tab, search, and filters, across all pages. */
  totalCount: number;
}

export type PostCounts = Record<PostTab, number>;

export const postTabs: readonly PostTab[] = [
  "pending",
  "approved",
  "declined",
  "all",
];

export const postSeverities: readonly PostSeverity[] = [
  "high",
  "medium",
  "low",
  "unrated",
];

export const reportCategories: readonly ReportCategory[] = [
  "animal_in_need",
  "potentially_dangerous_animal",
  "possible_invasive_species",
  "other_wildlife_incident",
];

export const postSortOptions: readonly PostSortOption[] = [
  "newest",
  "oldest",
  "severity",
];

const postStatuses: readonly PostStatus[] = ["pending", "approved", "declined"];

const speciesOrigins: readonly SpeciesOrigin[] = [
  "endemic",
  "native",
  "introduced",
];

const confidenceLabels: readonly ConfidenceLabel[] = [
  "high",
  "medium",
  "low",
  "uncertain",
];

/** Multiples of 2, 3, and 4 so every grid row is full. */
export const postPageSizeOptions = [12, 24, 48] as const;

export const defaultPostListQuery: PostListQuery = {
  tab: "pending",
  search: "",
  severity: "all",
  category: "all",
  sort: "newest",
  page: 1,
  pageSize: postPageSizeOptions[0],
};

/** A photo counts as taken at the sighting within this distance. */
export const exifMatchRadiusMeters = 500;

const severityRank: Record<PostSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
  unrated: 0,
};

const confidenceRank: Record<ConfidenceLabel, number> = {
  high: 3,
  medium: 2,
  low: 1,
  uncertain: 0,
};

function pickValue<T extends string>(
  value: unknown,
  options: readonly T[],
): T | null {
  return options.find((option) => option === value) ?? null;
}

/** `report_status` to the post status; unknown values count as pending. */
export function toPostStatus(status: string): PostStatus {
  return pickValue(status, postStatuses) ?? "pending";
}

/** `report_category`; null for a value this site doesn't know. */
export function toReportCategory(category: string): ReportCategory | null {
  return pickValue(category, reportCategories);
}

/** `species_origin`; null when unset or unknown. */
export function toSpeciesOrigin(origin: string | null): SpeciesOrigin | null {
  return pickValue(origin, speciesOrigins);
}

/**
 * The AI's `severity_level` to the card's severity: moderate shows as
 * Medium, critical as High, and uncertain or none as Unrated.
 */
export function toPostSeverity(level: string | null): PostSeverity {
  switch (level) {
    case "low":
      return "low";
    case "moderate":
      return "medium";
    case "high":
    case "critical":
      return "high";
    default:
      return "unrated";
  }
}

/** "3f2a9c1b-…" → "3F2A9C1B" */
export function toPostReference(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Reads `ai_analyses.possible_species`, skipping malformed entries. Older
 * rows used `name` instead of `common_name`; both are accepted.
 */
export function parsePossibleSpecies(value: unknown): AiSpeciesMatch[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: unknown) => {
    if (!isRecord(entry)) return [];
    const commonName = readText(entry.common_name) ?? readText(entry.name);
    if (!commonName) return [];
    return [
      {
        commonName,
        scientificName: readText(entry.scientific_name) ?? "",
        confidence:
          pickValue(entry.confidence, confidenceLabels) ?? "uncertain",
      },
    ];
  });
}

/** The most confident candidate; the stored order breaks ties. */
export function pickTopSpecies(
  candidates: readonly AiSpeciesMatch[],
): AiSpeciesMatch | null {
  return candidates.reduce<AiSpeciesMatch | null>(
    (best, candidate) =>
      !best ||
      confidenceRank[candidate.confidence] > confidenceRank[best.confidence]
        ? candidate
        : best,
    null,
  );
}

/** Reads `ai_analyses.validation`, skipping malformed entries. */
export function parseValidation(value: unknown): AiChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: unknown) => {
    if (!isRecord(entry)) return [];
    const key = readText(entry.label);
    if (!key || typeof entry.passed !== "boolean") return [];
    return [{ key, passed: entry.passed }];
  });
}

/** "location_consistent" → "Location consistent" */
export function humanizeKey(key: string): string {
  const words = key.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const earthRadiusMeters = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two points, in meters. */
export function getDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Compares each photo's EXIF GPS with the report's location. Photos
 * without both coordinates are ignored.
 */
export function getExifLocationCheck(
  report: { latitude: number; longitude: number },
  photos: readonly Pick<PostPhoto, "exif">[],
): ExifLocationCheck {
  const distances = photos.flatMap(({ exif }) =>
    exif && exif.latitude !== null && exif.longitude !== null
      ? [
          getDistanceMeters(report, {
            latitude: exif.latitude,
            longitude: exif.longitude,
          }),
        ]
      : [],
  );
  if (distances.length === 0) return "noGps";
  return distances.every((distance) => distance <= exifMatchRadiusMeters)
    ? "verified"
    : "mismatch";
}

/** "Apple" + "iPhone 13" → "Apple iPhone 13"; skips a repeated make. */
export function formatDevice(exif: PhotoExif): string | null {
  const make = exif.deviceMake?.trim() ?? "";
  const model = exif.deviceModel?.trim() ?? "";
  if (!make) return model || null;
  if (!model) return make;
  return model.toLowerCase().startsWith(make.toLowerCase())
    ? model
    : `${make} ${model}`;
}

/** The distinct devices the photos were taken with, or null for none. */
export function getObserverDevices(
  photos: readonly Pick<PostPhoto, "exif">[],
): string | null {
  const devices = new Set(
    photos.flatMap(({ exif }) => {
      const device = exif ? formatDevice(exif) : null;
      return device ? [device] : [];
    }),
  );
  return devices.size > 0 ? [...devices].join(", ") : null;
}

/**
 * Case-insensitive match on the description, species (the AI's and the
 * reporter's), reporter, or post reference.
 */
export function matchesPostSearch(post: PostSummary, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return [
    post.description,
    post.aiMatch?.commonName,
    post.aiMatch?.scientificName,
    post.reporterSpecies,
    post.reporter.fullName,
    post.reporter.username,
    post.reference,
  ].some((field) => field?.toLowerCase().includes(term));
}

export function matchesPostTab(post: PostSummary, tab: PostTab): boolean {
  return tab === "all" || post.status === tab;
}

function matchesFilter<T>(value: T, filter: Filter<T>): boolean {
  return filter === "all" || value === filter;
}

function byNewest(a: PostSummary, b: PostSummary): number {
  return b.submittedAt.localeCompare(a.submittedAt);
}

export function sortPosts<T extends PostSummary>(
  posts: readonly T[],
  sort: PostSortOption,
): T[] {
  const sorted = [...posts];
  switch (sort) {
    case "newest":
      return sorted.sort(byNewest);
    case "oldest":
      return sorted.sort((a, b) => byNewest(b, a));
    case "severity":
      return sorted.sort(
        (a, b) =>
          severityRank[b.severity] - severityRank[a.severity] || byNewest(a, b),
      );
  }
}

/** Applies tab, search, filters, sort, and pagination to a post list. */
export function queryPosts(
  posts: readonly PostSummary[],
  query: PostListQuery,
): PostPage {
  const matching = posts.filter(
    (post) =>
      matchesPostTab(post, query.tab) &&
      matchesFilter(post.severity, query.severity) &&
      matchesFilter(post.category, query.category) &&
      matchesPostSearch(post, query.search),
  );
  return {
    posts: paginate(
      sortPosts(matching, query.sort),
      query.page,
      query.pageSize,
    ),
    totalCount: matching.length,
  };
}

export function countPostsByTab(posts: readonly PostSummary[]): PostCounts {
  return {
    pending: posts.filter((post) => post.status === "pending").length,
    approved: posts.filter((post) => post.status === "approved").length,
    declined: posts.filter((post) => post.status === "declined").length,
    all: posts.length,
  };
}

/** True when any dropdown filter is narrowed from "all". */
export function hasActiveFilters(
  query: Pick<PostListQuery, "severity" | "category">,
): boolean {
  return query.severity !== "all" || query.category !== "all";
}

/**
 * The post's place in its status queue (newest first), e.g. 14 of 48
 * pending posts. Null when the post isn't in the list.
 */
export function getQueuePosition(
  posts: readonly PostSummary[],
  postId: string,
): PostQueuePosition | null {
  const post = posts.find((candidate) => candidate.id === postId);
  if (!post) return null;
  const queue = sortPosts(
    posts.filter((candidate) => candidate.status === post.status),
    "newest",
  );
  const index = queue.findIndex((candidate) => candidate.id === postId);
  return {
    position: index + 1,
    total: queue.length,
    previousId: queue[index - 1]?.id ?? null,
    nextId: queue[index + 1]?.id ?? null,
  };
}

/** Extra photos beyond the cover, for the "+3" badge. */
export function getExtraPhotoCount(post: PostSummary): number {
  return Math.max(0, post.photoPaths.length - 1);
}

/** Counts a reporter's reports by status. */
export function countReporterPosts(
  statuses: readonly PostStatus[],
): Pick<ReporterStats, "totalPosts" | "approvedPosts" | "declinedPosts"> {
  return {
    totalPosts: statuses.length,
    approvedPosts: statuses.filter((status) => status === "approved").length,
    declinedPosts: statuses.filter((status) => status === "declined").length,
  };
}

/** Approved posts as a percentage of decided posts, to one decimal place. */
export function getApprovalRate(stats: ReporterStats): number {
  const decided = stats.approvedPosts + stats.declinedPosts;
  if (decided === 0) return 0;
  return Math.round((stats.approvedPosts / decided) * 1000) / 10;
}

export type CommentSort = "newest" | "oldest";

export function sortComments(
  comments: readonly PostComment[],
  sort: CommentSort,
): PostComment[] {
  const sorted = [...comments].sort((a, b) =>
    b.postedAt.localeCompare(a.postedAt),
  );
  return sort === "newest" ? sorted : sorted.reverse();
}

export interface TextSegment {
  text: string;
  /** True for a scientific name, which is shown in italics. */
  isScientificName: boolean;
}

/**
 * Splits plain text so every occurrence of a scientific name can be
 * italicised without rendering user text as HTML.
 */
export function splitScientificName(
  text: string,
  scientificName: string,
): TextSegment[] {
  if (!scientificName) return [{ text, isScientificName: false }];
  const segments: TextSegment[] = [];
  let rest = text;
  let index = rest.indexOf(scientificName);
  while (index !== -1) {
    if (index > 0) {
      segments.push({ text: rest.slice(0, index), isScientificName: false });
    }
    segments.push({ text: scientificName, isScientificName: true });
    rest = rest.slice(index + scientificName.length);
    index = rest.indexOf(scientificName);
  }
  if (rest) segments.push({ text: rest, isScientificName: false });
  return segments;
}

function pickOption<T extends string>(
  value: string | null,
  options: readonly T[],
  fallback: T,
): T {
  return options.find((option) => option === value) ?? fallback;
}

function pickFilter<T extends string>(
  value: string | null,
  options: readonly T[],
): Filter<T> {
  return options.find((option) => option === value) ?? "all";
}

/**
 * Reads list state from URL search params so Back returns to the same
 * view. Unknown or invalid values fall back to the defaults.
 */
export function parsePostListParams(params: URLSearchParams): PostListQuery {
  const page = Number.parseInt(params.get("page") ?? "", 10);
  const pageSize = Number(params.get("size"));
  return {
    tab: pickOption(params.get("tab"), postTabs, defaultPostListQuery.tab),
    search: params.get("q") ?? defaultPostListQuery.search,
    severity: pickFilter(params.get("severity"), postSeverities),
    category: pickFilter(params.get("category"), reportCategories),
    sort: pickOption(
      params.get("sort"),
      postSortOptions,
      defaultPostListQuery.sort,
    ),
    page:
      Number.isInteger(page) && page >= 1 ? page : defaultPostListQuery.page,
    pageSize:
      postPageSizeOptions.find((size) => size === pageSize) ??
      defaultPostListQuery.pageSize,
  };
}

/** Writes list state to URL search params, leaving out default values. */
export function toPostListParams(query: PostListQuery): URLSearchParams {
  const entries: [string, string, string][] = [
    ["tab", query.tab, defaultPostListQuery.tab],
    ["q", query.search, defaultPostListQuery.search],
    ["severity", query.severity, defaultPostListQuery.severity],
    ["category", query.category, defaultPostListQuery.category],
    ["sort", query.sort, defaultPostListQuery.sort],
    ["page", String(query.page), String(defaultPostListQuery.page)],
    ["size", String(query.pageSize), String(defaultPostListQuery.pageSize)],
  ];
  return new URLSearchParams(
    entries
      .filter(([, value, fallback]) => value !== fallback)
      .map(([key, value]) => [key, value]),
  );
}
