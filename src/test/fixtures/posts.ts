import type { ChangeRequest } from "../../features/post-review/models/changeRequest";
import {
  reportCategories,
  toPostReference,
  type AiSpeciesMatch,
  type PostCardData,
  type PostComment,
  type PostDetail,
  type PostSeverity,
  type PostStatus,
  type PostSummary,
} from "../../features/post-review/models/post";
import { testUsers } from "./users";

/**
 * Fictional posts for tests: 30 reports (18 pending, 7 approved,
 * 5 declined), newest first, by reporters from the test users. Every name,
 * place and photo path is made up.
 */

const species: readonly AiSpeciesMatch[] = [
  {
    commonName: "Philippine Tarsier",
    scientificName: "Carlito syrichta",
    confidence: "high",
  },
  {
    commonName: "Philippine Eagle",
    scientificName: "Pithecophaga jefferyi",
    confidence: "medium",
  },
  {
    commonName: "Cane Toad",
    scientificName: "Rhinella marina",
    confidence: "high",
  },
  {
    commonName: "Reticulated Python",
    scientificName: "Malayopython reticulatus",
    confidence: "low",
  },
];

const severities: readonly PostSeverity[] = [
  "high",
  "medium",
  "low",
  "unrated",
];

const startMs = Date.UTC(2026, 9, 28, 12);

function statusAt(index: number): PostStatus {
  if (index < 18) return "pending";
  return index < 25 ? "approved" : "declined";
}

function reporterAt(index: number) {
  const user = testUsers[index % testUsers.length];
  if (!user) throw new Error("Test users are missing");
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    storedAvatar: null,
  };
}

export const testPosts: readonly PostSummary[] = Array.from(
  { length: 30 },
  (_, index): PostSummary => {
    const id = `${String(index + 1).padStart(8, "0")}-0d4e-4b1a-9c3e-1a2b3c4d5e6f`;
    const severity = severities[index % severities.length] ?? "unrated";
    const match = species[index % species.length] ?? null;
    return {
      id,
      reference: toPostReference(id),
      category:
        reportCategories[(index + 1) % reportCategories.length] ??
        "animal_in_need",
      description: `Sighting ${String(index + 1)} near the river trail.`,
      status: statusAt(index),
      severity,
      isInvasive: match?.commonName === "Cane Toad",
      submittedAt: new Date(startMs - index * 3 * 3_600_000).toISOString(),
      latitude: 9.85 + index / 100,
      longitude: 124.2,
      placeName: null,
      photoPaths: Array.from(
        { length: index === 0 ? 4 : (index % 3) + 1 },
        (_unused, photo) =>
          `${reporterAt(index).id}/${id}/${String(photo + 1)}.jpg`,
      ),
      // Unrated posts have no completed AI analysis.
      aiMatch: severity === "unrated" ? null : match,
      reporterSpecies: index % 5 === 0 ? "Tarsier" : null,
      reporter: reporterAt(index),
    };
  },
);

/** As the media query returns them: covers signed, no avatars. */
export function toTestCardData(post: PostSummary): PostCardData {
  const cover = post.photoPaths[0];
  return {
    ...post,
    coverUrl: cover ? `https://signed.example.org/${cover}` : null,
    reporterAvatar: null,
  };
}

const commenters: readonly [string, string][] = [
  ["Dr. Aris Thorne", "thorne_botanist"],
  ["Bea Alcantara", "bea_ecowatch"],
  ["Ana Villanueva", "ana.birds"],
  ["Paolo Mendoza", "paolo_wild"],
  ["Liza Navarro", "lizanav"],
  ["Carlos Ramos", "cramos_ranger"],
];

const tarsierComments: readonly PostComment[] = commenters.map(
  ([authorName, username], index) => ({
    id: `comment-${String(index + 1)}`,
    authorName,
    username,
    // The first comment is the newest.
    postedAt: new Date(startMs + (6 - index) * 600_000).toISOString(),
    body: `Comment ${String(index + 1)} about Carlito syrichta.`,
    isFlagged: index === 2,
    moderationNote: index === 2 ? "Possible location leak" : null,
    removal:
      index === 4
        ? {
            removedAt: new Date(startMs + 900_000).toISOString(),
            reason: "Shared a phone number",
            removedByName: "Alex Admin",
            isRemovedByFormerAdmin: false,
          }
        : null,
  }),
);

const firstPost = testPosts[0];
if (!firstPost) throw new Error("Test posts are missing");

/** The first pending post with full detail: 4 photos and 6 comments. */
export const testTarsier: PostDetail = {
  ...firstPost,
  aiMatch: species[0] ?? null,
  photos: firstPost.photoPaths.map((path, index) => ({
    path,
    url: `https://signed.example.org/${path}`,
    exif: {
      latitude: 9.85,
      longitude: 124.2,
      deviceMake: "Canon",
      deviceModel: "EOS R5",
      cameraSettings: `f/2.8 • 1/120s • ISO ${String(800 + index * 100)}`,
      flashFired: index === 1,
    },
  })),
  reporterAvatar: null,
  reporterNotes: "Watched it for ten minutes from the trail.",
  fieldNotes: {
    perchHeightMeters: 1.5,
    hostTree: "Narra",
    isNightObservation: true,
  },
  location: {
    latitude: 9.85,
    longitude: 124.2,
    placeName: null,
    elevationMeters: 120,
    exifCheck: "verified",
  },
  comments: tarsierComments,
  reporterStats: {
    totalPosts: 42,
    approvedPosts: 39,
    declinedPosts: 3,
    memberSince: "2023-11-03T08:00:00+00:00",
  },
  ai: {
    severitySummary: "Alert and uninjured.",
    origin: "endemic",
    checklist: [
      { key: "image_relevant", passed: true },
      { key: "blur_check", passed: false },
    ],
    synthesis: "An adult Carlito syrichta resting near the trail.",
    recommendations: "Keep a quiet distance and avoid flash photography.",
  },
};

/**
 * A post's change request history, newest round first: round 3 is open,
 * round 2 was withdrawn by an admin, round 1 was resubmitted by the reporter.
 */
export const testChangeRequests: readonly ChangeRequest[] = [
  {
    id: "request-3",
    round: 3,
    message: "Please pin the exact spot.\nThe map shows the wrong trail.",
    fields: ["location", "category"],
    requestedAt: "2026-11-09T08:00:00Z",
    requestedByName: "Alex Admin",
    isRequestedByFormerAdmin: false,
    resolution: null,
    resolvedAt: null,
    withdrawnByName: null,
    isWithdrawnByFormerAdmin: false,
  },
  {
    id: "request-2",
    round: 2,
    message: "Is this a tarsier?",
    fields: ["speciesDescription"],
    requestedAt: "2026-11-05T08:00:00Z",
    requestedByName: "Bea Admin",
    isRequestedByFormerAdmin: false,
    resolution: "withdrawn",
    resolvedAt: "2026-11-06T08:00:00Z",
    withdrawnByName: null,
    isWithdrawnByFormerAdmin: true,
  },
  {
    id: "request-1",
    round: 1,
    message: "The photo is blurry.",
    fields: ["photos"],
    requestedAt: "2026-11-01T08:00:00Z",
    requestedByName: null,
    isRequestedByFormerAdmin: true,
    resolution: "resubmitted",
    resolvedAt: "2026-11-02T08:00:00Z",
    withdrawnByName: null,
    isWithdrawnByFormerAdmin: false,
  },
];
