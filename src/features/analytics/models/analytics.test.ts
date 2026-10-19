import { describe, expect, it } from "vitest";
import {
  formatReviewTime,
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
  type SightingHotspot,
} from "./analytics";

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
    });
    expect(shares.map((share) => [share.key, share.percent])).toEqual([
      ["low", 58],
      ["medium", 32],
      ["high", 10],
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
      { reviewerName: "C", decisions: 10 },
      { reviewerName: "A", decisions: 50 },
      { reviewerName: "B", decisions: 30 },
      { reviewerName: "D", decisions: 6 },
      { reviewerName: "E", decisions: 4 },
    ]);
    expect(shares).toEqual([
      { reviewerName: "A", decisions: 50, percent: 50 },
      { reviewerName: "B", decisions: 30, percent: 30 },
      { reviewerName: "C", decisions: 10, percent: 10 },
      { reviewerName: null, decisions: 10, percent: 10 },
    ]);
  });
});
