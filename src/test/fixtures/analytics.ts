import {
  getRangeStart,
  type AnalyticsRange,
  type AnalyticsReport,
  type AnalyticsReview,
  type DeclineReason,
  type SectorCell,
} from "../../features/analytics/models/analytics";
import type { AnalyticsData } from "../../features/analytics/services/analyticsService";
import {
  reportCategories,
  type AiSpeciesMatch,
  type PostSeverity,
  type PostStatus,
} from "../../features/post-review/models/post";
import { testUsers } from "./users";

/**
 * Fictional analytics data for tests: 20 reports, one a day from Oct 30
 * back to Oct 11 2026 (5 pending, 10 approved, 5 declined), each decided
 * report reviewed i + 1 hours after submission.
 */

export const testAnalyticsNow = new Date("2026-10-30T12:00:00Z");

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
];

const severities: readonly PostSeverity[] = [
  "high",
  "medium",
  "low",
  "unrated",
  "medium",
];

const statuses: readonly PostStatus[] = [
  "pending",
  "approved",
  "approved",
  "declined",
];

const declineReasons: readonly DeclineReason[] = [
  "inaccurateSpecies",
  "lowQualityPhoto",
  "inaccurateSpecies",
];

export const testReviewerNames = new Map([
  ["admin-1", "Ana Reyes"],
  ["admin-2", "Ben Cruz"],
  ["admin-3", "Cora Lim"],
]);

const hourMs = 3_600_000;

const allReports: readonly AnalyticsReport[] = Array.from(
  { length: 20 },
  (_, index): AnalyticsReport => {
    const submitted = Date.UTC(2026, 9, 30 - index, 8);
    const severity = severities[index % severities.length] ?? "unrated";
    const match =
      severity === "unrated" ? null : (species[index % species.length] ?? null);
    const status = statuses[index % statuses.length] ?? "pending";
    const user = testUsers[index % 3];
    if (!user) throw new Error("Test users are missing");
    return {
      id: `report-${String(index)}`,
      submittedAt: new Date(submitted).toISOString(),
      category:
        reportCategories[index % reportCategories.length] ?? "animal_in_need",
      status,
      severity,
      isInvasive: match?.commonName === "Cane Toad",
      species: match,
      reporter: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
      },
      coverPhotoPath: `${user.id}/report-${String(index)}/1.jpg`,
      firstDecidedAt:
        status === "pending"
          ? null
          : new Date(submitted + (index + 1) * hourMs).toISOString(),
    };
  },
);

const allReviews: readonly AnalyticsReview[] = allReports.flatMap(
  (report, index): AnalyticsReview[] =>
    report.status === "pending" || !report.firstDecidedAt
      ? []
      : [
          {
            reportId: report.id,
            decision: report.status,
            declineReason:
              report.status === "declined"
                ? (declineReasons[index % declineReasons.length] ?? null)
                : null,
            reviewerId: `admin-${String((index % 3) + 1)}`,
            decidedAt: report.firstDecidedAt,
          },
        ],
);

/** As `fetchAnalyticsData(range)` would load it at `testAnalyticsNow`. */
export function testAnalyticsData(range: AnalyticsRange): AnalyticsData {
  const start = getRangeStart(range, testAnalyticsNow).toISOString();
  return {
    now: testAnalyticsNow,
    reports: allReports.filter((report) => report.submittedAt >= start),
    reviews: allReviews.filter((review) => review.decidedAt >= start),
    reviewerNames: testReviewerNames,
  };
}

export const testSectorCells: readonly SectorCell[] = [
  {
    latitude: 7.05,
    longitude: 125.25,
    reportCount: 12,
    categoryCounts: { animal_in_need: 8, possible_invasive_species: 4 },
  },
  {
    latitude: 10.35,
    longitude: 123.95,
    reportCount: 5,
    categoryCounts: { animal_in_need: 2, other_wildlife_incident: 3 },
  },
  {
    latitude: 14.65,
    longitude: 121.05,
    reportCount: 3,
    categoryCounts: { potentially_dangerous_animal: 3 },
  },
];
