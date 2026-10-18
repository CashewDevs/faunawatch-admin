/**
 * Post Approvals domain model: the wildlife posts the admin site reviews,
 * list query options, and pure list helpers.
 *
 * TODO(schema): Field names here are the admin site's presentation model,
 * not database columns. The mobile app/backend owns the reports schema
 * (including where the AI-derived fields and moderation status live). Map
 * Supabase rows to these shapes in the posts Service once it exists.
 */

import { paginate } from "../../../core/utils/pagination";

export type PostStatus = "pending" | "approved" | "declined";

export type PostTab = PostStatus | "all";

export type PostSeverity = "low" | "medium" | "high";

export type SpeciesCategory =
  "mammal" | "bird" | "reptile" | "amphibian" | "insect";

export type PostRegion = "luzon" | "visayas" | "mindanao";

export type PostSortOption = "newest" | "oldest" | "severity";

/** Whether the identified species belongs in the Philippines. */
export type SpeciesOrigin = "endemic" | "native" | "introduced";

export type Filter<T> = "all" | T;

export interface PostReporter {
  id: string;
  fullName: string;
  username: string;
  /** Display label such as "Senior Ranger". */
  role: string;
  avatarUrl: string | null;
}

/** The AI's species identification for the post's photos. */
export interface AiSpeciesMatch {
  commonName: string;
  scientificName: string;
  /** 0–100, e.g. 98.4. */
  confidencePercent: number;
}

/** What a post card shows. */
export interface PostSummary {
  id: string;
  /** Human-facing post number, e.g. 1042 for "Post #1042". */
  reference: number;
  title: string;
  description: string;
  status: PostStatus;
  severity: PostSeverity;
  category: SpeciesCategory;
  region: PostRegion;
  /** Short place name, e.g. "Mount Apo Natural Park, Davao". */
  locationName: string;
  isInvasive: boolean;
  /** ISO 8601 date-time the post was submitted. */
  submittedAt: string;
  photoUrls: readonly string[];
  aiMatch: AiSpeciesMatch;
  reporter: PostReporter;
}

export interface PostLocation {
  address: string;
  latitude: number;
  longitude: number;
  elevationMeters: number | null;
  /** True when the coordinates come from the photo's EXIF GPS data. */
  isExifVerified: boolean;
  /** Public blur radius the AI recommends, or null when none is needed. */
  recommendedBufferKm: number | null;
  mapPreviewUrl: string | null;
}

export interface PostComment {
  id: string;
  authorName: string;
  username: string;
  /** ISO 8601 date-time. */
  postedAt: string;
  body: string;
  isFlagged: boolean;
  moderationNote: string | null;
}

export interface ReporterStats {
  totalPosts: number;
  approvedPosts: number;
  declinedPosts: number;
  /** ISO 8601 date the reporter joined. */
  memberSince: string;
  isVerified: boolean;
}

export interface AiChecklistItem {
  label: string;
  passed: boolean;
}

/** AI-derived decision support stored with the report. */
export interface PostAiAnalysis {
  severitySummary: string;
  origin: SpeciesOrigin;
  checklist: readonly AiChecklistItem[];
  synthesis: string;
  recommendations: readonly string[];
  /** Null when the AI couldn't tell. */
  usedArtificialFlash: boolean | null;
}

export interface PostFieldNotes {
  perchHeightMeters: number | null;
  hostTree: string | null;
  observerDevice: string | null;
  isNightObservation: boolean;
  /** EXIF camera summary, e.g. "f/2.8 • 1/120s • ISO 800 • 85mm". */
  cameraSettings: string | null;
}

/** Everything the post detail screen shows. */
export interface PostDetail extends PostSummary {
  fieldNotes: PostFieldNotes;
  location: PostLocation;
  comments: readonly PostComment[];
  reporterStats: ReporterStats;
  ai: PostAiAnalysis;
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
  category: Filter<SpeciesCategory>;
  region: Filter<PostRegion>;
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
];
export const speciesCategories: readonly SpeciesCategory[] = [
  "mammal",
  "bird",
  "reptile",
  "amphibian",
  "insect",
];
export const postRegions: readonly PostRegion[] = [
  "luzon",
  "visayas",
  "mindanao",
];
export const postSortOptions: readonly PostSortOption[] = [
  "newest",
  "oldest",
  "severity",
];

/** Multiples of 2, 3, and 4 so every grid row is full. */
export const postPageSizeOptions = [12, 24, 48] as const;

export const defaultPostListQuery: PostListQuery = {
  tab: "pending",
  search: "",
  severity: "all",
  category: "all",
  region: "all",
  sort: "newest",
  page: 1,
  pageSize: postPageSizeOptions[0],
};

const severityRank: Record<PostSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Case-insensitive match on title, species, reporter, or place. */
export function matchesPostSearch(post: PostSummary, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return [
    post.title,
    post.aiMatch.commonName,
    post.aiMatch.scientificName,
    post.reporter.fullName,
    post.reporter.username,
    post.locationName,
  ].some((field) => field.toLowerCase().includes(term));
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
      matchesFilter(post.region, query.region) &&
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
  query: Pick<PostListQuery, "severity" | "category" | "region">,
): boolean {
  return (
    query.severity !== "all" ||
    query.category !== "all" ||
    query.region !== "all"
  );
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
  return Math.max(0, post.photoUrls.length - 1);
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

export type AvatarTone = "primary" | "amber" | "teal";

const avatarTones: readonly AvatarTone[] = ["primary", "amber", "teal"];

/** Stable colour for an initials avatar, picked from the name. */
export function getAvatarTone(name: string): AvatarTone {
  let sum = 0;
  for (let index = 0; index < name.length; index += 1) {
    sum += name.charCodeAt(index);
  }
  return avatarTones[sum % avatarTones.length] ?? "primary";
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
    category: pickFilter(params.get("species"), speciesCategories),
    region: pickFilter(params.get("region"), postRegions),
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
    ["species", query.category, defaultPostListQuery.category],
    ["region", query.region, defaultPostListQuery.region],
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
