import {
  createSignedUrls,
  resolveAvatars,
} from "../../../core/services/storageService";
import { supabase } from "../../../core/services/supabaseClient";
import { parseAvatarPath } from "../../../core/utils/avatars";
import { getProfileDisplayName } from "../../../core/utils/names";
import {
  countReporterPosts,
  getExifLocationCheck,
  parsePossibleSpecies,
  parseValidation,
  pickTopSpecies,
  toPostReference,
  toPostSeverity,
  toPostStatus,
  toReportCategory,
  toSpeciesOrigin,
  type PostCardData,
  type PostComment,
  type PostDetail,
  type PostPhoto,
  type PostSummary,
} from "../models/post";

/**
 * Posts Service: loads reports for review with their reporter, photos,
 * EXIF data, newest completed AI analysis, and comments, and signs photos
 * in the private `report-images` bucket. Admin RLS lets these queries read
 * every row; moderation writes are not wired up yet (TODO(moderation)).
 *
 * TODO(schema): Every report is loaded at once and the list is filtered,
 * sorted and paged in the browser (prototype scale, 1,000 reports or
 * fewer, which is also PostgREST's default row limit). For more, move
 * search, filters, sort and range-based paging to the server.
 *
 * The client has no generated types; the row shapes below follow the
 * faunawatch repo's migrations.
 */

/** The reporter or comment author. `!user_id` names the foreign key. */
interface ProfileRow {
  full_name: string | null;
  username: string | null;
  display_name: string | null;
  avatar_path: string | null;
}

interface AnalysisRow {
  status: string;
  possible_species: unknown;
  severity: string | null;
  possible_invasive: boolean;
  created_at: string;
}

interface ReportListRow {
  id: string;
  category: string;
  description: string | null;
  status: string;
  created_at: string;
  latitude: number;
  longitude: number;
  /** Null when the app's lookup failed, and on older reports. */
  place_name: string | null;
  user_species: string | null;
  user_id: string;
  reporter: ProfileRow;
  report_images: { storage_path: string; created_at: string }[];
  ai_analyses: AnalysisRow[];
}

interface ExifRow {
  gps_latitude: number | null;
  gps_longitude: number | null;
  device_make: string | null;
  device_model: string | null;
  camera_settings: string | null;
  flash_fired: boolean | null;
}

/** One-to-one embeds come back as an object; tolerate an array too. */
type Embedded<T> = T | T[] | null;

interface DetailAnalysisRow extends AnalysisRow {
  species_origin: string | null;
  validation: unknown;
  visual_condition_assessment: string | null;
  incident_summary: string | null;
  safety_recommendations: string | null;
}

interface ReportDetailRow extends Omit<
  ReportListRow,
  "reporter" | "report_images" | "ai_analyses"
> {
  elevation_m: number | null;
  user_notes: string | null;
  perch_height_m: number | null;
  host_tree: string | null;
  is_night_observation: boolean | null;
  reporter: ProfileRow & { created_at: string };
  report_images: {
    storage_path: string;
    created_at: string;
    report_image_exif: Embedded<ExifRow>;
  }[];
  ai_analyses: DetailAnalysisRow[];
  report_comments: {
    id: string;
    body: string;
    created_at: string;
    author: ProfileRow;
    comment_moderation: Embedded<{
      is_flagged: boolean;
      note: string | null;
      removed_at: string | null;
      moderated_by: string | null;
      moderator: Omit<ProfileRow, "avatar_path"> | null;
    }>;
  }[];
}

const profileColumns = "full_name, username, display_name, avatar_path";

const reportColumns =
  "id, category, description, status, created_at, latitude, longitude, place_name, user_species, user_id";

const analysisColumns =
  "status, possible_species, severity, possible_invasive, created_at";

const listColumns = [
  reportColumns,
  `reporter:profiles!user_id(${profileColumns})`,
  "report_images(storage_path, created_at)",
  `ai_analyses(${analysisColumns})`,
].join(", ");

const detailColumns = [
  reportColumns,
  "elevation_m, user_notes, perch_height_m, host_tree, is_night_observation",
  `reporter:profiles!user_id(${profileColumns}, created_at)`,
  "report_images(storage_path, created_at, report_image_exif(gps_latitude, gps_longitude, device_make, device_model, camera_settings, flash_fired))",
  `ai_analyses(${analysisColumns}, species_origin, validation, visual_condition_assessment, incident_summary, safety_recommendations)`,
  `report_comments(id, body, created_at, author:profiles!user_id(${profileColumns}), comment_moderation(is_flagged, note, removed_at, moderated_by, moderator:profiles!moderated_by(full_name, username, display_name)))`,
].join(", ");

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function textOrNull(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function firstEmbedded<T>(value: Embedded<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function byOldest(a: { created_at: string }, b: { created_at: string }) {
  return a.created_at.localeCompare(b.created_at);
}

function profileName(profile: ProfileRow): string {
  return (
    getProfileDisplayName(
      {
        fullName: profile.full_name,
        username: profile.username,
        displayName: profile.display_name,
      },
      null,
    ) ?? ""
  );
}

/** The newest completed analysis; the query already drops other rows. */
function newestCompleted<T extends AnalysisRow>(rows: readonly T[]): T | null {
  return (
    rows
      .filter((row) => row.status === "completed")
      .sort((a, b) => byOldest(b, a))[0] ?? null
  );
}

function toSummary(
  row: ReportListRow | ReportDetailRow,
  analysis: AnalysisRow | null,
): PostSummary {
  return {
    id: row.id,
    reference: toPostReference(row.id),
    // The enum has exactly these four values; this only guards a future one.
    category: toReportCategory(row.category) ?? "other_wildlife_incident",
    description: row.description ?? "",
    status: toPostStatus(row.status),
    severity: toPostSeverity(analysis?.severity ?? null),
    isInvasive: analysis?.possible_invasive ?? false,
    submittedAt: row.created_at,
    latitude: row.latitude,
    longitude: row.longitude,
    placeName: textOrNull(row.place_name),
    photoPaths: [...row.report_images]
      .sort(byOldest)
      .map((image) => image.storage_path),
    aiMatch: analysis
      ? pickTopSpecies(parsePossibleSpecies(analysis.possible_species))
      : null,
    reporterSpecies: textOrNull(row.user_species),
    reporter: {
      id: row.user_id,
      fullName: profileName(row.reporter),
      username: textOrNull(row.reporter.username),
      storedAvatar: parseAvatarPath(row.reporter.avatar_path),
    },
  };
}

/** Every report, newest first, without signed images. */
export async function fetchAllPosts(): Promise<PostSummary[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(listColumns)
    .eq("ai_analyses.status", "completed")
    .order("created_at", { ascending: false })
    .overrideTypes<ReportListRow[], { merge: false }>();
  if (error) throw new Error("Couldn't load posts.", { cause: error });
  return data.map((row) => toSummary(row, newestCompleted(row.ai_analyses)));
}

/**
 * Signs the cover photo and reporter avatar of each post on the current
 * page. Images are best-effort: one that can't be signed shows its
 * fallback.
 */
export async function fetchPostCardMedia(
  posts: readonly PostSummary[],
): Promise<PostCardData[]> {
  const coverPaths = posts.flatMap((post) => post.photoPaths.slice(0, 1));
  const [coverUrls, avatars] = await Promise.all([
    createSignedUrls("report-images", coverPaths),
    resolveAvatars(posts.map((post) => post.reporter.storedAvatar)),
  ]);
  return posts.map((post, index) => {
    const coverPath = post.photoPaths[0];
    return {
      ...post,
      coverUrl: coverPath ? (coverUrls.get(coverPath) ?? null) : null,
      reporterAvatar: avatars[index] ?? null,
    };
  });
}

async function fetchReporterStatuses(userId: string) {
  const { data, error } = await supabase
    .from("reports")
    .select("status")
    .eq("user_id", userId)
    .overrideTypes<{ status: string }[], { merge: false }>();
  if (error) {
    throw new Error("Couldn't load the reporter's posts.", { cause: error });
  }
  return data.map((row) => toPostStatus(row.status));
}

/**
 * One report with everything the review page shows, every photo signed.
 * Resolves to null when no report has this id.
 */
export async function fetchPost(postId: string): Promise<PostDetail | null> {
  // Postgres rejects a malformed uuid with an error; that's "not found".
  if (!uuidPattern.test(postId)) return null;

  const { data: row, error } = await supabase
    .from("reports")
    .select(detailColumns)
    .eq("id", postId)
    .eq("ai_analyses.status", "completed")
    .maybeSingle<ReportDetailRow>();
  if (error) throw new Error("Couldn't load this post.", { cause: error });
  if (!row) return null;

  const images = [...row.report_images].sort(byOldest);
  const [statuses, photoUrls, [reporterAvatar]] = await Promise.all([
    fetchReporterStatuses(row.user_id),
    createSignedUrls(
      "report-images",
      images.map((image) => image.storage_path),
    ),
    resolveAvatars([parseAvatarPath(row.reporter.avatar_path)]),
  ]);

  const photos: PostPhoto[] = images.map((image) => {
    const exif = firstEmbedded(image.report_image_exif);
    return {
      path: image.storage_path,
      url: photoUrls.get(image.storage_path) ?? null,
      exif: exif && {
        latitude: exif.gps_latitude,
        longitude: exif.gps_longitude,
        deviceMake: textOrNull(exif.device_make),
        deviceModel: textOrNull(exif.device_model),
        cameraSettings: textOrNull(exif.camera_settings),
        flashFired: exif.flash_fired,
      },
    };
  });

  // Admins see removed comments too, marked with who removed them and why.
  // The note is the flag's reason while flagged, the removal reason while
  // removed, and history otherwise.
  const comments: PostComment[] = row.report_comments.map((comment) => {
    const moderation = firstEmbedded(comment.comment_moderation);
    const note = textOrNull(moderation?.note ?? null);
    const removedAt = moderation?.removed_at ?? null;
    // Removing resolves a flag; older rows may still have both set.
    const isFlagged = (moderation?.is_flagged ?? false) && !removedAt;
    return {
      id: comment.id,
      authorName: profileName(comment.author),
      username: textOrNull(comment.author.username),
      postedAt: comment.created_at,
      body: comment.body,
      isFlagged,
      moderationNote: isFlagged ? note : null,
      removal: removedAt
        ? {
            removedAt,
            reason: note,
            removedByName: moderation?.moderator
              ? textOrNull(
                  profileName({ ...moderation.moderator, avatar_path: null }),
                )
              : null,
            isRemovedByFormerAdmin: moderation?.moderated_by === null,
          }
        : null,
    };
  });

  const analysis = newestCompleted(row.ai_analyses);
  return {
    ...toSummary(row, analysis),
    photos,
    reporterAvatar: reporterAvatar ?? null,
    reporterNotes: textOrNull(row.user_notes),
    fieldNotes: {
      perchHeightMeters: row.perch_height_m,
      hostTree: textOrNull(row.host_tree),
      isNightObservation: row.is_night_observation,
    },
    location: {
      latitude: row.latitude,
      longitude: row.longitude,
      placeName: textOrNull(row.place_name),
      elevationMeters: row.elevation_m,
      exifCheck: getExifLocationCheck(row, photos),
    },
    comments,
    reporterStats: {
      ...countReporterPosts(statuses),
      memberSince: row.reporter.created_at,
    },
    ai: analysis && {
      severitySummary: textOrNull(analysis.visual_condition_assessment),
      origin: toSpeciesOrigin(analysis.species_origin),
      checklist: parseValidation(analysis.validation),
      synthesis: textOrNull(analysis.incident_summary),
      recommendations: textOrNull(analysis.safety_recommendations),
    },
  };
}
