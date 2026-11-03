import { describe, expect, it } from "vitest";
import {
  formatCellName,
  formatReviewTime,
  formerReviewerId,
  getInvasiveAlerts,
  getLatestReviews,
  getMedian,
  getModerationActivity,
  getPostTrend,
  getRangeStart,
  getReviewOutcomeCounts,
  getSpeciesBreakdown,
  getTopContributors,
  toDeclineReason,
  toSightingHotspots,
  getAvailableGranularities,
  getBarPercent,
  getContributorApprovalRate,
  getDensityLevel,
  getReviewerShares,
  getSeverityShares,
  getTrendPeriodStarts,
  parseAnalyticsParams,
  placeHotspots,
  projectToPanel,
  resolveGranularity,
  summarizeReviewOutcomes,
  toAnalyticsParams,
  toPercent,
  toShares,
  type AnalyticsReport,
  type AnalyticsReview,
  type SightingHotspot,
} from "./analytics";

function makeReport(overrides: Partial<AnalyticsReport>): AnalyticsReport {
  return {
    id: "r",
    submittedAt: "2026-10-20T10:00:00Z",
    category: "animal_in_need",
    status: "pending",
    severity: "medium",
    isInvasive: false,
    species: {
      commonName: "Philippine Tarsier",
      scientificName: "Carlito syrichta",
      confidence: "high",
    },
    reporter: { id: "u1", fullName: "Maria Santos", username: "msantos" },
    coverPhotoPath: null,
    firstDecidedAt: null,
    ...overrides,
  };
}

function makeReview(overrides: Partial<AnalyticsReview>): AnalyticsReview {
  return {
    reportId: "r",
    decision: "approved",
    declineReason: null,
    reviewerId: "admin-1",
    decidedAt: "2026-10-20T12:00:00Z",
    ...overrides,
  };
}

describe("analytics URL params", () => {
  it("reads the tab and range, falling back on invalid values", () => {
    expect(
      parseAnalyticsParams(new URLSearchParams("tab=hotspots&range=90d")),
    ).toEqual({ tab: "hotspots", range: "90d" });
    expect(
      parseAnalyticsParams(new URLSearchParams("tab=nope&range=5y")),
    ).toEqual({ tab: "overview", range: "30d" });
  });

  it("writes only non-default values", () => {
    expect(
      toAnalyticsParams({ tab: "overview", range: "30d" }).toString(),
    ).toBe("");
    expect(toAnalyticsParams({ tab: "species", range: "12m" }).toString()).toBe(
      "tab=species&range=12m",
    );
  });
});

describe("percentages and shares", () => {
  it("rounds percentages and guards a zero total", () => {
    expect(toPercent(3150, 3842, 1)).toBe(82);
    expect(toPercent(1, 3)).toBe(33);
    expect(toPercent(5, 0)).toBe(0);
  });

  it("builds shares in the given order", () => {
    expect(toShares({ a: 1, b: 3 }, ["b", "a"])).toEqual([
      { key: "b", count: 3, percent: 75 },
      { key: "a", count: 1, percent: 25 },
    ]);
  });

  it("scales bars to the largest value", () => {
    expect(getBarPercent(241, 482)).toBe(50);
    expect(getBarPercent(10, 0)).toBe(0);
  });
});

describe("posts over time", () => {
  it("offers only readable granularities per range", () => {
    expect(getAvailableGranularities("7d")).toEqual(["daily"]);
    expect(getAvailableGranularities("12m")).toEqual(["weekly", "monthly"]);
  });

  it("falls back to the range default when the requested one isn't offered", () => {
    expect(resolveGranularity("30d", null)).toBe("weekly");
    expect(resolveGranularity("30d", "daily")).toBe("daily");
    expect(resolveGranularity("7d", "monthly")).toBe("daily");
    expect(resolveGranularity("12m", "daily")).toBe("monthly");
  });

  it("lists period starts ending on the given day", () => {
    const end = new Date("2026-10-30T15:00:00Z");
    const daily = getTrendPeriodStarts("7d", "daily", end);
    expect(daily).toHaveLength(7);
    expect(daily[0]).toBe("2026-10-24");
    expect(daily.at(-1)).toBe("2026-10-30");

    expect(getTrendPeriodStarts("30d", "weekly", end)).toEqual([
      "2026-10-03",
      "2026-10-10",
      "2026-10-17",
      "2026-10-24",
    ]);

    const monthly = getTrendPeriodStarts("12m", "monthly", end);
    expect(monthly[0]).toBe("2025-11-01");
    expect(monthly.at(-1)).toBe("2026-10-01");
    expect(monthly).toHaveLength(12);
  });
});

describe("summarizeReviewOutcomes", () => {
  it("derives the total, approval rate, and shares from counts", () => {
    const summary = summarizeReviewOutcomes({
      approved: 3150,
      declined: 384,
      awaitingTriage: 308,
    });
    expect(summary.total).toBe(3842);
    expect(summary.approvalPercent).toBe(89.1);
    expect(summary.shares.map((share) => share.percent)).toEqual([82, 10, 8]);
  });
});

describe("species and severity", () => {
  it("shares severity tiers mildest first", () => {
    const shares = getSeverityShares({
      low: { count: 2228, medianReviewMinutes: 324 },
      medium: { count: 1230, medianReviewMinutes: 126 },
      high: { count: 384, medianReviewMinutes: 25 },
      unrated: { count: 0, medianReviewMinutes: null },
    });
    expect(shares.map((share) => [share.key, share.percent])).toEqual([
      ["low", 58],
      ["medium", 32],
      ["high", 10],
      ["unrated", 0],
    ]);
  });

  it("formats review times in minutes or hours", () => {
    expect(formatReviewTime(25)).toBe("~25m");
    expect(formatReviewTime(324)).toBe("~5.4h");
    expect(formatReviewTime(120)).toBe("~2h");
  });
});

describe("hotspots", () => {
  it("assigns density relative to the busiest hotspot", () => {
    expect(getDensityLevel(800, 800)).toBe("critical");
    expect(getDensityLevel(450, 800)).toBe("high");
    expect(getDensityLevel(250, 800)).toBe("moderate");
    expect(getDensityLevel(100, 800)).toBe("low");
    expect(getDensityLevel(0, 0)).toBe("low");
  });

  it("projects coordinates inside the panel", () => {
    const corner = projectToPanel(30, 100);
    expect(corner).toEqual({ leftPercent: 10, topPercent: 10 });
    const mtApo = projectToPanel(7.0, 125.27);
    expect(mtApo.leftPercent).toBeGreaterThan(70);
    expect(mtApo.topPercent).toBeGreaterThan(70);
  });

  it("labels only the busiest hotspots and drops empty ones", () => {
    const hotspot = (id: string, sightingCount: number): SightingHotspot => ({
      id,
      name: id,
      latitude: 10,
      longitude: 122,
      sightingCount,
    });
    const placed = placeHotspots([
      hotspot("a", 100),
      hotspot("b", 800),
      hotspot("c", 0),
      hotspot("d", 600),
    ]);
    expect(placed.map((h) => h.id)).toEqual(["a", "b", "d"]);
    expect(placed.filter((h) => h.isLabelled).map((h) => h.id)).toEqual([
      "b",
      "d",
    ]);
    expect(placed.find((h) => h.id === "b")?.density).toBe("critical");
  });
});

describe("contributors and moderation", () => {
  it("computes a contributor's approval rate from decided posts", () => {
    expect(
      getContributorApprovalRate({
        id: "1",
        fullName: "A",
        username: "a",
        submissions: 129,
        approved: 118,
        declined: 7,
      }),
    ).toBe(94);
  });

  it("folds reviewers past the limit into Others", () => {
    const shares = getReviewerShares([
      { reviewerId: "c", reviewerName: "C", decisions: 10 },
      { reviewerId: "a", reviewerName: "A", decisions: 50 },
      { reviewerId: "b", reviewerName: "B", decisions: 30 },
      { reviewerId: "d", reviewerName: "D", decisions: 6 },
      { reviewerId: "e", reviewerName: "E", decisions: 4 },
    ]);
    expect(shares).toEqual([
      { reviewerId: "a", reviewerName: "A", decisions: 50, percent: 50 },
      { reviewerId: "b", reviewerName: "B", decisions: 30, percent: 30 },
      { reviewerId: "c", reviewerName: "C", decisions: 10, percent: 10 },
      { reviewerId: null, reviewerName: null, decisions: 10, percent: 10 },
    ]);
  });
});

describe("range and record helpers", () => {
  it("starts the range at midnight UTC on its first day", () => {
    const now = new Date("2026-10-30T15:30:00Z");
    expect(getRangeStart("7d", now).toISOString()).toBe(
      "2026-10-24T00:00:00.000Z",
    );
    expect(getRangeStart("12m", now).toISOString()).toBe(
      "2025-10-31T00:00:00.000Z",
    );
  });

  it("finds the median", () => {
    expect(getMedian([5, 1, 3])).toBe(3);
    expect(getMedian([4, 1, 3, 2])).toBe(2.5);
    expect(getMedian([])).toBeNull();
  });

  it("keeps each report's latest decision", () => {
    const first = makeReview({ reportId: "a", decision: "declined" });
    const second = makeReview({
      reportId: "a",
      decidedAt: "2026-10-21T00:00:00Z",
    });
    const other = makeReview({ reportId: "b" });
    expect(getLatestReviews([second, first, other])).toEqual([second, other]);
  });
});

describe("overview aggregates", () => {
  const now = new Date("2026-10-30T15:30:00Z");

  it("counts submissions and latest decisions per period", () => {
    const trend = getPostTrend(
      [
        makeReport({ submittedAt: "2026-10-29T23:00:00Z" }),
        makeReport({ submittedAt: "2026-10-30T01:00:00Z" }),
        // Before the range: left out.
        makeReport({ submittedAt: "2026-10-01T00:00:00Z" }),
      ],
      [
        makeReview({ reportId: "a", decidedAt: "2026-10-30T09:00:00Z" }),
        makeReview({
          reportId: "b",
          decision: "declined",
          decidedAt: "2026-10-29T09:00:00Z",
        }),
        // Overruled by the decline above.
        makeReview({ reportId: "b", decidedAt: "2026-10-28T09:00:00Z" }),
      ],
      "7d",
      "daily",
      now,
    );
    expect(trend).toHaveLength(7);
    expect(trend.slice(-2)).toEqual([
      { periodStart: "2026-10-29", submitted: 1, approved: 0, declined: 1 },
      { periodStart: "2026-10-30", submitted: 1, approved: 1, declined: 0 },
    ]);
    expect(trend.reduce((sum, point) => sum + point.approved, 0)).toBe(1);
  });

  it("counts review outcomes by current status", () => {
    expect(
      getReviewOutcomeCounts([
        makeReport({ status: "approved" }),
        makeReport({ status: "approved" }),
        makeReport({ status: "declined" }),
        makeReport({ status: "pending" }),
      ]),
    ).toEqual({ approved: 2, declined: 1, awaitingTriage: 1 });
  });
});

describe("getSpeciesBreakdown", () => {
  it("ranks AI species, counts categories, and times each tier", () => {
    const breakdown = getSpeciesBreakdown([
      makeReport({
        severity: "high",
        firstDecidedAt: "2026-10-20T10:30:00Z",
      }),
      makeReport({
        severity: "high",
        species: {
          commonName: "philippine tarsier",
          scientificName: "",
          confidence: "low",
        },
        firstDecidedAt: "2026-10-20T11:30:00Z",
      }),
      makeReport({
        category: "possible_invasive_species",
        species: {
          commonName: "Cane Toad",
          scientificName: "Rhinella marina",
          confidence: "high",
        },
      }),
      makeReport({ severity: "unrated", species: null }),
    ]);

    expect(breakdown.topSpecies).toEqual([
      { commonName: "Philippine Tarsier", count: 2 },
      { commonName: "Cane Toad", count: 1 },
    ]);
    expect(breakdown.categoryCounts).toEqual({
      animal_in_need: 3,
      potentially_dangerous_animal: 0,
      possible_invasive_species: 1,
      other_wildlife_incident: 0,
    });
    expect(breakdown.severity).toEqual({
      low: { count: 0, medianReviewMinutes: null },
      medium: { count: 1, medianReviewMinutes: null },
      high: { count: 2, medianReviewMinutes: 60 },
      unrated: { count: 1, medianReviewMinutes: null },
    });
  });
});

describe("hotspot cells", () => {
  it("names cells by their centre", () => {
    expect(formatCellName(7.05, 125.25)).toBe("7.05°N, 125.25°E");
    expect(formatCellName(-0.5, -1)).toBe("0.50°S, 1.00°W");
  });

  it("counts every category or just one", () => {
    const cells = [
      {
        latitude: 7.05,
        longitude: 125.25,
        reportCount: 5,
        categoryCounts: { animal_in_need: 3, other_wildlife_incident: 2 },
      },
    ];
    expect(toSightingHotspots(cells, "all")).toEqual([
      {
        id: "7.05°N, 125.25°E",
        name: "7.05°N, 125.25°E",
        latitude: 7.05,
        longitude: 125.25,
        sightingCount: 5,
      },
    ]);
    expect(toSightingHotspots(cells, "animal_in_need")[0]?.sightingCount).toBe(
      3,
    );
    expect(
      toSightingHotspots(cells, "possible_invasive_species")[0]?.sightingCount,
    ).toBe(0);
  });
});

describe("getInvasiveAlerts", () => {
  it("lists the newest invasive reports and counts them all", () => {
    const reports = Array.from({ length: 12 }, (_, index) =>
      makeReport({
        id: String(index),
        isInvasive: true,
        submittedAt: `2026-10-${String(10 + index)}T00:00:00Z`,
        coverPhotoPath: `u/${String(index)}/1.jpg`,
      }),
    );
    const { total, alerts } = getInvasiveAlerts([
      ...reports,
      makeReport({ id: "native" }),
      makeReport({
        id: "no-species",
        isInvasive: true,
        species: null,
        submittedAt: "2026-09-01T00:00:00Z",
      }),
    ]);

    expect(total).toBe(13);
    expect(alerts).toHaveLength(10);
    expect(alerts[0]).toEqual({
      id: "11",
      category: "animal_in_need",
      commonName: "Philippine Tarsier",
      scientificName: "Carlito syrichta",
      reportedAt: "2026-10-21T00:00:00Z",
      photoPath: "u/11/1.jpg",
      photoUrl: null,
    });
  });
});

describe("getTopContributors", () => {
  it("ranks reporters by submissions in the range", () => {
    const maria = { id: "u1", fullName: "Maria Santos", username: "msantos" };
    const jose = { id: "u2", fullName: "Jose Reyes", username: null };
    expect(
      getTopContributors([
        makeReport({ reporter: jose, status: "approved" }),
        makeReport({ reporter: maria, status: "approved" }),
        makeReport({ reporter: maria, status: "declined" }),
        makeReport({ reporter: maria }),
      ]),
    ).toEqual([
      { ...maria, submissions: 3, approved: 1, declined: 1 },
      { ...jose, submissions: 1, approved: 1, declined: 0 },
    ]);
  });
});

describe("getModerationActivity", () => {
  it("maps decline reasons from the database", () => {
    expect(toDeclineReason("inaccurate_gps")).toBe("inaccurateLocation");
    expect(toDeclineReason("duplicate")).toBe("duplicateSighting");
    expect(toDeclineReason("unknown")).toBeNull();
    expect(toDeclineReason(null)).toBeNull();
  });

  it("counts every decision per reviewer and latest decline reasons", () => {
    const activity = getModerationActivity(
      [
        makeReview({
          reportId: "a",
          decision: "declined",
          declineReason: "lowQualityPhoto",
          decidedAt: "2026-10-20T10:00:00Z",
        }),
        // Re-reviewed and approved: its decline reason no longer counts.
        makeReview({ reportId: "a", reviewerId: "admin-2" }),
        makeReview({
          reportId: "b",
          decision: "declined",
          declineReason: "duplicateSighting",
        }),
        makeReview({ reportId: "c", reviewerId: "ghost" }),
        // Both made by admins whose accounts were deleted.
        makeReview({ reportId: "d", reviewerId: null }),
        makeReview({ reportId: "e", reviewerId: null }),
      ],
      new Map([
        ["admin-1", "Ana Admin"],
        ["admin-2", "Ben Admin"],
      ]),
      { unknown: "Unknown reviewer", former: "Former admin" },
    );

    expect(activity.reviewers).toEqual([
      { reviewerId: "admin-1", reviewerName: "Ana Admin", decisions: 2 },
      { reviewerId: "admin-2", reviewerName: "Ben Admin", decisions: 1 },
      { reviewerId: "ghost", reviewerName: "Unknown reviewer", decisions: 1 },
      {
        reviewerId: formerReviewerId,
        reviewerName: "Former admin",
        decisions: 2,
      },
    ]);
    expect(activity.declineReasonCounts).toEqual({
      inaccurateSpecies: 0,
      lowQualityPhoto: 0,
      domesticSpecimen: 0,
      duplicateSighting: 1,
      inaccurateLocation: 0,
    });
  });
});
