/**
 * Map domain model: which posts get a pin, the status filters and their
 * counts, and the map's address-bar state.
 * Posts come from the Post Approvals model; the map adds no data of its own.
 */

import type { MapViewMode } from "../../../core/services/mapboxConfig";
import type {
  KnownPostStatus,
  PostSummary,
} from "../../post-review/models/post";

/** One pin on the map. */
export interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  status: KnownPostStatus;
  /** The post's first photo for the pin's head; null shows the logo. */
  photoUrl: string | null;
  /** What a screen reader announces for the pin. */
  label: string;
}

/** The map's state kept in the address bar, so "Back" can restore it. */
export interface PostsMapQuery {
  /** Statuses switched off; every offered status is shown by default. */
  hidden: readonly KnownPostStatus[];
  view: MapViewMode;
  /** The post whose summary card is open. */
  postId: string | null;
}

const allMapStatuses: readonly KnownPostStatus[] = [
  "pending",
  "changes_requested",
  "approved",
  "declined",
];

const mapStatusesWithoutChanges: readonly KnownPostStatus[] =
  allMapStatuses.filter((status) => status !== "changes_requested");

/**
 * The status filters to offer; "Changes requested" only when Request
 * changes is on, like the Post Approvals tabs. Returns the same array each
 * time, so it is safe to depend on.
 */
export function getMapStatuses(
  isRequestChangesEnabled: boolean,
): readonly KnownPostStatus[] {
  return isRequestChangesEnabled ? allMapStatuses : mapStatusesWithoutChanges;
}

export const defaultPostsMapQuery: PostsMapQuery = {
  hidden: [],
  view: "3d",
  postId: null,
};

/** A real spot on Earth (rules out missing or corrupt coordinates). */
export function hasValidCoordinates(point: {
  latitude: number;
  longitude: number;
}): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

function isOffered(
  status: PostSummary["status"],
  statuses: readonly KnownPostStatus[],
): status is KnownPostStatus {
  return statuses.some((candidate) => candidate === status);
}

/**
 * Posts that can have a pin: an offered status and a usable location.
 * Unknown statuses, and "Changes requested" while it's switched off, never
 * appear on the map.
 */
export function getMappablePosts(
  posts: readonly PostSummary[],
  statuses: readonly KnownPostStatus[],
): PostSummary[] {
  return posts.filter(
    (post) => isOffered(post.status, statuses) && hasValidCoordinates(post),
  );
}

/** Mappable posts whose status isn't switched off. */
export function getVisiblePosts(
  mappable: readonly PostSummary[],
  hidden: readonly string[],
): PostSummary[] {
  return mappable.filter(
    (post) => !hidden.some((status) => status === post.status),
  );
}

/** How many pins each status has, for the filter chips. */
export function countMapPosts(
  mappable: readonly PostSummary[],
): Record<KnownPostStatus, number> {
  const counts: Record<KnownPostStatus, number> = {
    pending: 0,
    changes_requested: 0,
    approved: 0,
    declined: 0,
  };
  for (const post of mappable) {
    if (post.status !== "unknown") counts[post.status] += 1;
  }
  return counts;
}

/** Switches one status on or off. */
export function toggleHiddenStatus(
  hidden: readonly KnownPostStatus[],
  status: KnownPostStatus,
): KnownPostStatus[] {
  return hidden.includes(status)
    ? hidden.filter((candidate) => candidate !== status)
    : [...hidden, status];
}

/**
 * The species to title a post with: the AI's match, else the reporter's
 * own name for it; null when neither exists.
 */
export function getSpeciesName(post: PostSummary): string | null {
  return post.aiMatch?.commonName ?? post.reporterSpecies;
}

/**
 * Reads the map's state from the address bar. Unknown or unoffered values
 * are ignored, so an old or edited link still opens a working map.
 */
export function parsePostsMapParams(
  params: URLSearchParams,
  statuses: readonly KnownPostStatus[],
): PostsMapQuery {
  const hidden = (params.get("hide") ?? "")
    .split(",")
    .filter((value): value is KnownPostStatus =>
      statuses.some((status) => status === value),
    );
  const postId = params.get("post")?.trim() ?? "";
  return {
    // Keep the chips' order, without repeats.
    hidden: statuses.filter((status) => hidden.includes(status)),
    view: params.get("view") === "2d" ? "2d" : "3d",
    postId: postId || null,
  };
}

/** The address-bar form of the map's state; defaults are left out. */
export function toPostsMapParams(query: PostsMapQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.hidden.length > 0) params.set("hide", query.hidden.join(","));
  if (query.view === "2d") params.set("view", "2d");
  if (query.postId) params.set("post", query.postId);
  return params;
}
