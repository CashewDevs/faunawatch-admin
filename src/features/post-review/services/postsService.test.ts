import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSignedUrls,
  resolveAvatars,
} from "../../../core/services/storageService";
import type { PostSummary } from "../models/post";
import { fetchAllPosts, fetchPost, fetchPostCardMedia } from "./postsService";

const from = vi.hoisted(() => vi.fn());

vi.mock("../../../core/services/supabaseClient", () => ({
  supabase: { from },
}));

vi.mock("../../../core/services/storageService", () => ({
  createSignedUrls: vi.fn(),
  resolveAvatars: vi.fn(),
}));

const createSignedUrlsMock = vi.mocked(createSignedUrls);
const resolveAvatarsMock = vi.mocked(resolveAvatars);

/** A chainable PostgREST query whose terminal call resolves to `result`. */
function mockQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    overrideTypes: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return query;
}

const reportId = "3f2a9c1b-0d4e-4b1a-9c3e-1a2b3c4d5e6f";

const reporter = {
  full_name: "Maria Santos",
  username: "msantos",
  display_name: null,
  avatar_path: "preset:bunny",
};

const completedAnalysis = {
  status: "completed",
  possible_species: [
    {
      common_name: "Crested Serpent Eagle",
      scientific_name: "Spilornis cheela",
      confidence: "low",
    },
    {
      common_name: "Philippine Eagle",
      scientific_name: "Pithecophaga jefferyi",
      confidence: "high",
    },
  ],
  severity: "critical",
  possible_invasive: false,
  created_at: "2026-10-20T10:05:00+00:00",
};

const listRow = {
  id: reportId,
  category: "potentially_dangerous_animal",
  description: "Large raptor near the trail.",
  status: "pending",
  created_at: "2026-10-20T10:00:00+00:00",
  latitude: 7.05,
  longitude: 125.25,
  place_name: "Lusod, Kabayan, Benguet",
  user_species: "  ",
  user_id: "user-1",
  reporter,
  report_images: [
    { storage_path: "user-1/r/2.jpg", created_at: "2026-10-20T10:01:00Z" },
    { storage_path: "user-1/r/1.jpg", created_at: "2026-10-20T10:00:30Z" },
  ],
  ai_analyses: [
    {
      ...completedAnalysis,
      severity: "low",
      created_at: "2026-10-20T10:02:00+00:00",
    },
    completedAnalysis,
    // The query filters these out; the Service ignores them anyway.
    { ...completedAnalysis, status: "failed", created_at: "2026-10-21" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  createSignedUrlsMock.mockImplementation((_bucket, paths) =>
    Promise.resolve(
      new Map(
        paths
          .filter((path) => !path.includes("unsignable"))
          .map((path) => [path, `https://signed/${path}`]),
      ),
    ),
  );
  resolveAvatarsMock.mockImplementation((avatars) =>
    Promise.resolve(
      avatars.map((avatar) =>
        avatar?.kind === "upload"
          ? { kind: "photo", url: `https://signed/${avatar.path}` }
          : (avatar ?? null),
      ),
    ),
  );
});

describe("fetchAllPosts", () => {
  it("maps reports with their newest completed AI analysis", async () => {
    const query = mockQuery({ data: [listRow], error: null });
    from.mockReturnValue(query);

    const posts = await fetchAllPosts();

    expect(from).toHaveBeenCalledWith("reports");
    expect(query.select).toHaveBeenCalledWith(
      expect.stringContaining("reporter:profiles!user_id("),
    );
    expect(query.eq).toHaveBeenCalledWith("ai_analyses.status", "completed");
    expect(query.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(posts).toEqual([
      {
        id: reportId,
        reference: "3F2A9C1B",
        category: "potentially_dangerous_animal",
        description: "Large raptor near the trail.",
        status: "pending",
        severity: "high",
        isInvasive: false,
        submittedAt: "2026-10-20T10:00:00+00:00",
        latitude: 7.05,
        longitude: 125.25,
        placeName: "Lusod, Kabayan, Benguet",
        photoPaths: ["user-1/r/1.jpg", "user-1/r/2.jpg"],
        aiMatch: {
          commonName: "Philippine Eagle",
          scientificName: "Pithecophaga jefferyi",
          confidence: "high",
        },
        reporterSpecies: null,
        reporter: {
          id: "user-1",
          fullName: "Maria Santos",
          username: "msantos",
          storedAvatar: { kind: "preset", name: "bunny" },
        },
      },
    ]);
  });

  it("leaves a report without a completed analysis unrated", async () => {
    from.mockReturnValue(
      mockQuery({
        data: [
          {
            ...listRow,
            description: null,
            user_species: "Philippine Eagle",
            reporter: { ...reporter, full_name: null, username: null },
            report_images: [],
            ai_analyses: [],
          },
        ],
        error: null,
      }),
    );

    const [post] = await fetchAllPosts();

    expect(post).toMatchObject({
      description: "",
      severity: "unrated",
      isInvasive: false,
      aiMatch: null,
      photoPaths: [],
      reporterSpecies: "Philippine Eagle",
      reporter: { fullName: "", username: null },
    });
  });

  it("throws when the query fails", async () => {
    from.mockReturnValue(
      mockQuery({ data: null, error: { message: "permission denied" } }),
    );
    await expect(fetchAllPosts()).rejects.toThrow("Couldn't load posts.");
  });
});

describe("fetchPostCardMedia", () => {
  const summary = (overrides: Partial<PostSummary>): PostSummary => ({
    id: "a",
    reference: "A",
    category: "animal_in_need",
    description: "",
    status: "pending",
    severity: "unrated",
    isInvasive: false,
    submittedAt: "2026-10-20T10:00:00Z",
    latitude: 0,
    longitude: 0,
    placeName: null,
    photoPaths: [],
    aiMatch: null,
    reporterSpecies: null,
    reporter: { id: "u", fullName: "", username: null, storedAvatar: null },
    ...overrides,
  });

  it("signs only each post's cover photo and resolves avatars", async () => {
    const posts = [
      summary({
        id: "a",
        photoPaths: ["u/a/cover.jpg", "u/a/second.jpg"],
        reporter: {
          id: "u",
          fullName: "",
          username: null,
          storedAvatar: { kind: "upload", path: "u/me.jpg" },
        },
      }),
      summary({ id: "b", photoPaths: ["u/b/unsignable.jpg"] }),
      summary({ id: "c" }),
    ];

    const cards = await fetchPostCardMedia(posts);

    expect(createSignedUrlsMock).toHaveBeenCalledWith("report-images", [
      "u/a/cover.jpg",
      "u/b/unsignable.jpg",
    ]);
    expect(
      cards.map(({ id, coverUrl, reporterAvatar }) => ({
        id,
        coverUrl,
        reporterAvatar,
      })),
    ).toEqual([
      {
        id: "a",
        coverUrl: "https://signed/u/a/cover.jpg",
        reporterAvatar: { kind: "photo", url: "https://signed/u/me.jpg" },
      },
      { id: "b", coverUrl: null, reporterAvatar: null },
      { id: "c", coverUrl: null, reporterAvatar: null },
    ]);
  });
});

describe("fetchPost", () => {
  const exif = {
    gps_latitude: 7.051,
    gps_longitude: 125.25,
    device_make: "Apple",
    device_model: "iPhone 13",
    camera_settings: "f/1.6 • 1/120s • ISO 400",
    flash_fired: false,
  };

  const detailRow = {
    ...listRow,
    user_species: "Philippine Eagle",
    elevation_m: 1200,
    user_notes: "Perched for ten minutes.",
    perch_height_m: 15,
    host_tree: " ",
    is_night_observation: null,
    reporter: { ...reporter, created_at: "2023-09-12T08:00:00+00:00" },
    report_images: [
      {
        storage_path: "user-1/r/2.jpg",
        created_at: "2026-10-20T10:01:00Z",
        // One-to-one embeds may arrive as an array.
        report_image_exif: [{ ...exif, gps_latitude: null }],
      },
      {
        storage_path: "user-1/r/1.jpg",
        created_at: "2026-10-20T10:00:30Z",
        report_image_exif: exif,
      },
      {
        storage_path: "user-1/r/unsignable.jpg",
        created_at: "2026-10-20T10:03:00Z",
        report_image_exif: null,
      },
    ],
    ai_analyses: [
      {
        ...completedAnalysis,
        species_origin: "endemic",
        validation: [
          { label: "image_relevant", passed: true },
          { label: "location_consistent", passed: false },
        ],
        visual_condition_assessment: "Alert and uninjured.",
        incident_summary: "An adult eagle perched near a trail.",
        safety_recommendations: "Keep 50 m away.",
      },
    ],
    report_comments: [
      {
        id: "c1",
        body: "Great find!",
        created_at: "2026-10-20T11:00:00Z",
        author: { ...reporter, full_name: "Jorge Reyes", username: "jreyes" },
        comment_moderation: null,
      },
      {
        id: "c2",
        body: "Spam link",
        created_at: "2026-10-20T12:00:00Z",
        author: reporter,
        comment_moderation: {
          is_flagged: true,
          note: "Removed for spam",
          removed_at: "2026-10-20T13:00:00Z",
          moderated_by: "admin-1",
          moderator: {
            full_name: "Alex Admin",
            username: "alex",
            display_name: null,
          },
        },
      },
      {
        id: "c3",
        body: "Is this location right?",
        created_at: "2026-10-20T14:00:00Z",
        author: { ...reporter, full_name: null, username: null },
        comment_moderation: {
          is_flagged: true,
          note: "Check tone",
          removed_at: null,
          moderated_by: null,
          moderator: null,
        },
      },
      {
        id: "c4",
        body: "Call me",
        created_at: "2026-10-20T15:00:00Z",
        author: reporter,
        comment_moderation: {
          is_flagged: false,
          note: "Phone number",
          removed_at: "2026-10-20T16:00:00Z",
          moderated_by: null,
          moderator: null,
        },
      },
    ],
  };

  function mockDetail(
    detail: { data: unknown; error: unknown },
    statuses: { data: unknown; error: unknown } = {
      data: [
        { status: "approved" },
        { status: "declined" },
        { status: "pending" },
        { status: "approved" },
      ],
      error: null,
    },
  ) {
    const detailQuery = mockQuery(detail);
    const statusQuery = mockQuery(statuses);
    // Drop a status query left queued by an earlier early return.
    from.mockReset();
    from.mockReturnValueOnce(detailQuery).mockReturnValueOnce(statusQuery);
    return { detailQuery, statusQuery };
  }

  it("maps a report with photos, EXIF, comments, stats, and AI", async () => {
    const { detailQuery, statusQuery } = mockDetail({
      data: detailRow,
      error: null,
    });

    const post = await fetchPost(reportId);

    expect(detailQuery.eq).toHaveBeenCalledWith("id", reportId);
    expect(detailQuery.eq).toHaveBeenCalledWith(
      "ai_analyses.status",
      "completed",
    );
    expect(statusQuery.select).toHaveBeenCalledWith("status");
    expect(statusQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(post).toMatchObject({
      id: reportId,
      severity: "high",
      reporterSpecies: "Philippine Eagle",
      photoPaths: [
        "user-1/r/1.jpg",
        "user-1/r/2.jpg",
        "user-1/r/unsignable.jpg",
      ],
      reporterAvatar: { kind: "preset", name: "bunny" },
      reporterNotes: "Perched for ten minutes.",
      fieldNotes: {
        perchHeightMeters: 15,
        hostTree: null,
        isNightObservation: null,
      },
      location: {
        latitude: 7.05,
        longitude: 125.25,
        placeName: "Lusod, Kabayan, Benguet",
        elevationMeters: 1200,
        // The one photo with full GPS is about 110 m away.
        exifCheck: "verified",
      },
      reporterStats: {
        totalPosts: 4,
        approvedPosts: 2,
        declinedPosts: 1,
        memberSince: "2023-09-12T08:00:00+00:00",
      },
      ai: {
        severitySummary: "Alert and uninjured.",
        origin: "endemic",
        checklist: [
          { key: "image_relevant", passed: true },
          { key: "location_consistent", passed: false },
        ],
        synthesis: "An adult eagle perched near a trail.",
        recommendations: "Keep 50 m away.",
      },
    });
    expect(post?.photos).toEqual([
      {
        path: "user-1/r/1.jpg",
        url: "https://signed/user-1/r/1.jpg",
        exif: {
          latitude: 7.051,
          longitude: 125.25,
          deviceMake: "Apple",
          deviceModel: "iPhone 13",
          cameraSettings: "f/1.6 • 1/120s • ISO 400",
          flashFired: false,
        },
      },
      {
        path: "user-1/r/2.jpg",
        url: "https://signed/user-1/r/2.jpg",
        exif: expect.objectContaining({ latitude: null }) as unknown,
      },
      { path: "user-1/r/unsignable.jpg", url: null, exif: null },
    ]);
    // Removed comments stay listed for admins, with who removed them.
    expect(post?.comments).toEqual([
      {
        id: "c1",
        authorName: "Jorge Reyes",
        username: "jreyes",
        postedAt: "2026-10-20T11:00:00Z",
        body: "Great find!",
        isFlagged: false,
        moderationNote: null,
        removal: null,
      },
      {
        id: "c2",
        authorName: "Maria Santos",
        username: "msantos",
        postedAt: "2026-10-20T12:00:00Z",
        body: "Spam link",
        // Removing resolved the flag.
        isFlagged: false,
        moderationNote: null,
        removal: {
          removedAt: "2026-10-20T13:00:00Z",
          reason: "Removed for spam",
          removedByName: "Alex Admin",
          isRemovedByFormerAdmin: false,
        },
      },
      {
        id: "c3",
        authorName: "",
        username: null,
        postedAt: "2026-10-20T14:00:00Z",
        body: "Is this location right?",
        isFlagged: true,
        moderationNote: "Check tone",
        removal: null,
      },
      {
        id: "c4",
        authorName: "Maria Santos",
        username: "msantos",
        postedAt: "2026-10-20T15:00:00Z",
        body: "Call me",
        isFlagged: false,
        moderationNote: null,
        removal: {
          removedAt: "2026-10-20T16:00:00Z",
          reason: "Phone number",
          removedByName: null,
          isRemovedByFormerAdmin: true,
        },
      },
    ]);
  });

  it("has no AI analysis when none completed", async () => {
    mockDetail({ data: { ...detailRow, ai_analyses: [] }, error: null });

    const post = await fetchPost(reportId);

    expect(post?.ai).toBeNull();
    expect(post?.aiMatch).toBeNull();
    expect(post?.severity).toBe("unrated");
  });

  it("resolves to null for a missing or malformed id", async () => {
    mockDetail({ data: null, error: null });
    await expect(fetchPost(reportId)).resolves.toBeNull();

    from.mockClear();
    await expect(fetchPost("missing")).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("throws when the report or the reporter's posts fail to load", async () => {
    mockDetail({ data: null, error: { message: "denied" } });
    await expect(fetchPost(reportId)).rejects.toThrow(
      "Couldn't load this post.",
    );

    mockDetail(
      { data: detailRow, error: null },
      { data: null, error: { message: "denied" } },
    );
    await expect(fetchPost(reportId)).rejects.toThrow(
      "Couldn't load the reporter's posts.",
    );
  });
});
