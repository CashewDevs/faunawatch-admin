import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSignedUrls } from "../../../core/services/storageService";
import type { InvasiveAlert } from "../models/analytics";
import {
  fetchAnalyticsData,
  fetchSectorCells,
  signAlertPhotos,
} from "./analyticsService";

const from = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());

vi.mock("../../../core/services/supabaseClient", () => ({
  supabase: { from, rpc },
}));

vi.mock("../../../core/services/storageService", () => ({
  createSignedUrls: vi.fn(),
}));

type Result = { data: unknown; error: unknown };

/** A chainable PostgREST query that resolves to `result`. */
function mockQuery(result: Result) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    order: vi.fn(),
    overrideTypes: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return query;
}

function mockTables(results: Record<string, Result>) {
  const queries = Object.fromEntries(
    Object.entries(results).map(([table, result]) => [
      table,
      mockQuery(result),
    ]),
  );
  from.mockImplementation((table: string) => queries[table]);
  return queries;
}

const now = new Date("2026-10-30T15:30:00Z");

const reportRow = {
  id: "report-1",
  category: "possible_invasive_species",
  status: "declined",
  created_at: "2026-10-28T08:00:00+00:00",
  user_id: "user-1",
  reporter: { full_name: null, username: "msantos", display_name: null },
  report_images: [
    { storage_path: "user-1/report-1/2.jpg", created_at: "2026-10-28T08:02Z" },
    { storage_path: "user-1/report-1/1.jpg", created_at: "2026-10-28T08:01Z" },
  ],
  ai_analyses: [
    {
      status: "completed",
      possible_species: [
        {
          common_name: "Cane Toad",
          scientific_name: "Rhinella marina",
          confidence: "high",
        },
      ],
      severity: "moderate",
      possible_invasive: true,
      created_at: "2026-10-28T08:05:00+00:00",
    },
    {
      status: "completed",
      possible_species: [],
      severity: "low",
      possible_invasive: false,
      created_at: "2026-10-28T08:03:00+00:00",
    },
  ],
  report_reviews: [
    { decided_at: "2026-10-29T10:00:00+00:00" },
    { decided_at: "2026-10-28T20:00:00+00:00" },
  ],
};

const reviewRow = {
  report_id: "report-1",
  decision: "declined",
  decline_reason: "low_quality_photo",
  decided_by: "admin-1",
  decided_at: "2026-10-29T10:00:00+00:00",
  reviewer: { full_name: "Ana Admin", username: null, display_name: null },
};

const deletedReviewerRow = { ...reviewRow, decided_by: null, reviewer: null };

beforeEach(() => {
  vi.clearAllMocks();
  from.mockReset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("fetchAnalyticsData", () => {
  it("loads the range's reports, reviews, and reviewer names", async () => {
    const queries = mockTables({
      reports: { data: [reportRow], error: null },
      report_reviews: {
        data: [
          reviewRow,
          {
            ...reviewRow,
            decision: "pending",
            decided_by: "admin-2",
            reviewer: { full_name: "Ben", username: null, display_name: null },
          },
        ],
        error: null,
      },
    });

    const data = await fetchAnalyticsData("7d");

    expect(data.now).toEqual(now);
    expect(queries.reports?.gte).toHaveBeenCalledWith(
      "created_at",
      "2026-10-24T00:00:00.000Z",
    );
    expect(queries.reports?.eq).toHaveBeenCalledWith(
      "ai_analyses.status",
      "completed",
    );
    expect(queries.report_reviews?.gte).toHaveBeenCalledWith(
      "decided_at",
      "2026-10-24T00:00:00.000Z",
    );
    expect(queries.report_reviews?.select).toHaveBeenCalledWith(
      expect.stringContaining("reviewer:profiles!decided_by("),
    );
    expect(from).not.toHaveBeenCalledWith("profiles");

    expect(data.reports).toEqual([
      {
        id: "report-1",
        submittedAt: "2026-10-28T08:00:00+00:00",
        category: "possible_invasive_species",
        status: "declined",
        severity: "medium",
        isInvasive: true,
        species: {
          commonName: "Cane Toad",
          scientificName: "Rhinella marina",
          confidence: "high",
        },
        reporter: { id: "user-1", fullName: "msantos", username: "msantos" },
        coverPhotoPath: "user-1/report-1/1.jpg",
        firstDecidedAt: "2026-10-28T20:00:00+00:00",
      },
    ]);
    // The row with an invalid decision is dropped.
    expect(data.reviews).toEqual([
      {
        reportId: "report-1",
        decision: "declined",
        declineReason: "lowQualityPhoto",
        reviewerId: "admin-1",
        decidedAt: "2026-10-29T10:00:00+00:00",
      },
    ]);
    expect(data.reviewerNames).toEqual(new Map([["admin-1", "Ana Admin"]]));
  });

  it("keeps decisions by deleted admins, with no name", async () => {
    mockTables({
      reports: { data: [reportRow], error: null },
      report_reviews: {
        data: [reviewRow, deletedReviewerRow],
        error: null,
      },
    });

    const data = await fetchAnalyticsData("7d");

    expect(data.reviews.map((review) => review.reviewerId)).toEqual([
      "admin-1",
      null,
    ]);
    expect(data.reviewerNames).toEqual(new Map([["admin-1", "Ana Admin"]]));
  });

  it("leaves out a reviewer whose profile has no name", async () => {
    mockTables({
      reports: { data: [reportRow], error: null },
      report_reviews: {
        data: [
          {
            ...reviewRow,
            reviewer: { full_name: " ", username: null, display_name: null },
          },
        ],
        error: null,
      },
    });

    const data = await fetchAnalyticsData("7d");

    expect(data.reviews).toHaveLength(1);
    expect(data.reviewerNames).toEqual(new Map());
  });

  it("handles a range without reviews", async () => {
    mockTables({
      reports: {
        data: [{ ...reportRow, ai_analyses: [], report_reviews: [] }],
        error: null,
      },
      report_reviews: { data: [], error: null },
    });

    const data = await fetchAnalyticsData("30d");

    expect(data.reviewerNames).toEqual(new Map());
    expect(data.reports[0]).toMatchObject({
      severity: "unrated",
      isInvasive: false,
      species: null,
      firstDecidedAt: null,
    });
  });

  it("throws when a query fails", async () => {
    mockTables({
      reports: { data: null, error: { message: "denied" } },
      report_reviews: { data: [], error: null },
    });
    await expect(fetchAnalyticsData("7d")).rejects.toThrow(
      "Couldn't load reports.",
    );

    mockTables({
      reports: { data: [], error: null },
      report_reviews: { data: null, error: { message: "denied" } },
    });
    await expect(fetchAnalyticsData("7d")).rejects.toThrow(
      "Couldn't load reviews.",
    );
  });
});

describe("fetchSectorCells", () => {
  it("calls admin_sector_stats for the range and keeps known categories", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          cell_lat: 7.05,
          cell_lng: 125.25,
          report_count: 5,
          categories: {
            animal_in_need: 3,
            mammal: 1,
            other_wildlife_incident: 1,
          },
        },
      ],
      error: null,
    });

    const cells = await fetchSectorCells("90d");

    expect(rpc).toHaveBeenCalledWith("admin_sector_stats", {
      p_from_ts: "2026-08-02T00:00:00.000Z",
      p_to_ts: "2026-10-30T15:30:00.000Z",
    });
    expect(cells).toEqual([
      {
        latitude: 7.05,
        longitude: 125.25,
        reportCount: 5,
        categoryCounts: { animal_in_need: 3, other_wildlife_incident: 1 },
      },
    ]);
  });

  it("throws when the RPC fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "denied" } });
    await expect(fetchSectorCells("7d")).rejects.toThrow(
      "Couldn't load hotspots.",
    );
  });
});

describe("signAlertPhotos", () => {
  it("signs each alert's photo, leaving unsigned ones empty", async () => {
    vi.mocked(createSignedUrls).mockResolvedValue(
      new Map([["u/a/1.jpg", "https://signed/u/a/1.jpg"]]),
    );
    const alert = (id: string, photoPath: string | null): InvasiveAlert => ({
      id,
      category: "possible_invasive_species",
      commonName: "Cane Toad",
      scientificName: "Rhinella marina",
      reportedAt: "2026-10-28T08:00:00Z",
      photoPath,
      photoUrl: null,
    });

    const signed = await signAlertPhotos([
      alert("a", "u/a/1.jpg"),
      alert("b", "u/b/1.jpg"),
      alert("c", null),
    ]);

    expect(createSignedUrls).toHaveBeenCalledWith("report-images", [
      "u/a/1.jpg",
      "u/b/1.jpg",
    ]);
    expect(signed.map((item) => item.photoUrl)).toEqual([
      "https://signed/u/a/1.jpg",
      null,
      null,
    ]);
  });
});
