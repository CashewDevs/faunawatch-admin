import photoCaneToad from "../../../assets/mock/posts/photo-cane-toad.jpg";
import type {
  PostSeverity,
  SpeciesCategory,
} from "../../post-review/models/post";
import {
  getTrendPeriodStarts,
  rangeDays,
  type AnalyticsRange,
  type ContributorStats,
  type DeclineReason,
  type HotspotCategoryFilter,
  type InvasiveAlert,
  type ModerationActivity,
  type PostTrendPoint,
  type ReviewOutcomeCounts,
  type SeverityStats,
  type SightingHotspot,
  type SpeciesBreakdown,
  type TrendGranularity,
} from "../models/analytics";

/**
 * Fictional analytics for the Analytics screen, based on the Figma frames.
 * The 30-day figures match Figma; other ranges scale them so switching the
 * date range visibly changes the numbers.
 *
 * TODO(schema): Delete this file once the analytics Service queries
 * Supabase. Hotspot sectors, invasive threat types, reviewer names, and
 * decline reasons are Figma copy, not values from any schema.
 */

const rangeScale: Record<AnalyticsRange, number> = {
  "7d": 0.24,
  "30d": 1,
  "90d": 2.85,
  "12m": 11.2,
};

function scale(count: number, range: AnalyticsRange): number {
  return Math.round(count * rangeScale[range]);
}

function scaleAll<T extends string>(
  counts: Record<T, number>,
  range: AnalyticsRange,
): Record<T, number> {
  const scaled = { ...counts };
  for (const key of Object.keys(counts) as T[]) {
    scaled[key] = scale(counts[key], range);
  }
  return scaled;
}

// ── Posts over time ──────────────────────────────────────────

const dayMs = 86_400_000;

/**
 * Smooth, repeatable daily submission count that climbs towards the end
 * of the range (like the Figma chart) with a gentle wave on top.
 */
function submissionsOnDay(
  dayNumber: number,
  endDay: number,
  range: AnalyticsRange,
): number {
  const progress = 1 - (endDay - dayNumber) / rangeDays[range];
  return Math.round(
    80 +
      70 * progress +
      14 * Math.sin(dayNumber / 5) +
      6 * Math.sin(dayNumber / 2.3),
  );
}

export function mockPostTrend(
  range: AnalyticsRange,
  granularity: TrendGranularity,
  now: Date,
): PostTrendPoint[] {
  const starts = getTrendPeriodStarts(range, granularity, now);
  const endDay = Math.floor(now.getTime() / dayMs);
  return starts.map((periodStart, index) => {
    const firstDay = Math.floor(Date.parse(periodStart) / dayMs);
    const nextStart = starts[index + 1];
    const periodEnd =
      nextStart === undefined
        ? endDay
        : Math.floor(Date.parse(nextStart) / dayMs) - 1;
    let submitted = 0;
    for (let day = firstDay; day <= periodEnd; day += 1) {
      submitted += submissionsOnDay(day, endDay, range);
    }
    return {
      periodStart,
      submitted,
      approved: Math.round(submitted * 0.82),
      declined: Math.round(submitted * 0.1),
    };
  });
}

// ── Review outcomes ──────────────────────────────────────────

export function mockReviewOutcomes(range: AnalyticsRange): ReviewOutcomeCounts {
  return scaleAll(
    { approved: 3150, declined: 384, awaitingTriage: 308 },
    range,
  );
}

// ── Species & severity ───────────────────────────────────────

const topSpecies: readonly [string, number][] = [
  ["Philippine Tarsier", 482],
  ["Philippine Eagle", 318],
  ["Whale Shark", 294],
  ["Palawan Peacock-Pheasant", 245],
  ["Hawksbill Sea Turtle", 210],
  ["Rufous Hornbill", 188],
  ["Sailfin Lizard", 162],
  ["Dugong", 115],
];

const categoryCounts: Record<SpeciesCategory, number> = {
  mammal: 1229,
  bird: 1075,
  reptile: 614,
  amphibian: 230,
  insect: 233,
};

const severityStats: Record<PostSeverity, SeverityStats> = {
  low: { count: 2228, medianReviewMinutes: 324 },
  medium: { count: 1230, medianReviewMinutes: 126 },
  high: { count: 384, medianReviewMinutes: 25 },
};

export function mockSpeciesBreakdown(range: AnalyticsRange): SpeciesBreakdown {
  return {
    topSpecies: topSpecies.map(([commonName, count]) => ({
      commonName,
      count: scale(count, range),
    })),
    categoryCounts: scaleAll(categoryCounts, range),
    severity: {
      low: {
        ...severityStats.low,
        count: scale(severityStats.low.count, range),
      },
      medium: {
        ...severityStats.medium,
        count: scale(severityStats.medium.count, range),
      },
      high: {
        ...severityStats.high,
        count: scale(severityStats.high.count, range),
      },
    },
  };
}

// ── Hotspots ─────────────────────────────────────────────────

interface MockHotspot extends Omit<SightingHotspot, "sightingCount"> {
  counts: Record<SpeciesCategory, number>;
}

const hotspots: readonly MockHotspot[] = [
  {
    id: "palawan",
    name: "Palawan Biosphere",
    latitude: 9.8,
    longitude: 118.7,
    counts: { mammal: 180, bird: 210, reptile: 120, amphibian: 54, insect: 60 },
  },
  {
    id: "mt-apo",
    name: "Mt. Apo Sector",
    latitude: 7.0,
    longitude: 125.27,
    counts: { mammal: 260, bird: 300, reptile: 130, amphibian: 62, insect: 60 },
  },
  {
    id: "sierra-madre",
    name: "Sierra Madre Corridor",
    latitude: 16.9,
    longitude: 121.9,
    counts: { mammal: 120, bird: 160, reptile: 60, amphibian: 30, insect: 40 },
  },
  {
    id: "bicol",
    name: "Bicol Wetlands",
    latitude: 13.4,
    longitude: 123.4,
    counts: { mammal: 40, bird: 90, reptile: 50, amphibian: 40, insect: 30 },
  },
  {
    id: "central-visayas",
    name: "Central Visayas Forests",
    latitude: 10.3,
    longitude: 123.9,
    counts: { mammal: 60, bird: 70, reptile: 40, amphibian: 15, insect: 25 },
  },
  {
    id: "mindoro",
    name: "Mindoro Highlands",
    latitude: 12.9,
    longitude: 121.1,
    counts: { mammal: 30, bird: 40, reptile: 20, amphibian: 10, insect: 10 },
  },
];

export function mockHotspots(
  range: AnalyticsRange,
  category: HotspotCategoryFilter,
): SightingHotspot[] {
  return hotspots.map(({ counts, ...hotspot }) => {
    const total =
      category === "all"
        ? Object.values<number>(counts).reduce((sum, n) => sum + n, 0)
        : counts[category];
    return { ...hotspot, sightingCount: scale(total, range) };
  });
}

// ── Invasive alerts ──────────────────────────────────────────

const invasiveAlerts: readonly (Omit<InvasiveAlert, "reportedOn"> & {
  daysAgo: number;
})[] = [
  {
    id: "alert-1",
    commonName: "Cane Toad",
    scientificName: "Rhinella marina",
    locationName: "Carcar, Cebu",
    threat: "colony",
    photoUrl: photoCaneToad,
    daysAgo: 0,
  },
  {
    id: "alert-2",
    commonName: "Golden Apple Snail",
    scientificName: "Pomacea canaliculata",
    locationName: "Bicol River",
    threat: "aquatic",
    photoUrl: null,
    daysAgo: 1,
  },
  {
    id: "alert-3",
    commonName: "Tilapia Escapee Swarm",
    scientificName: "Oreochromis niloticus",
    locationName: "Taal Lake Buffer",
    threat: "ecosystem",
    photoUrl: null,
    daysAgo: 3,
  },
  {
    id: "alert-4",
    commonName: "Red-eared Slider",
    scientificName: "Trachemys scripta elegans",
    locationName: "Angat Watershed",
    threat: "biosecurity",
    photoUrl: null,
    daysAgo: 5,
  },
  {
    id: "alert-5",
    commonName: "Janitor Fish",
    scientificName: "Pterygoplichthys pardalis",
    locationName: "Laguna de Bay",
    threat: "aquatic",
    photoUrl: null,
    daysAgo: 41,
  },
  {
    id: "alert-6",
    commonName: "Giant African Land Snail",
    scientificName: "Lissachatina fulica",
    locationName: "La Trinidad, Benguet",
    threat: "colony",
    photoUrl: null,
    daysAgo: 160,
  },
];

export function mockInvasiveAlerts(
  range: AnalyticsRange,
  now: Date,
): InvasiveAlert[] {
  return invasiveAlerts
    .filter((alert) => alert.daysAgo < rangeDays[range])
    .map(({ daysAgo, ...alert }) => ({
      ...alert,
      reportedOn: new Date(now.getTime() - daysAgo * dayMs)
        .toISOString()
        .slice(0, 10),
    }));
}

// ── Contributors & moderation ────────────────────────────────

const contributors: readonly ContributorStats[] = [
  {
    id: "c-1",
    fullName: "Dr. Aris Thorne",
    username: "thorne_botanist",
    submissions: 129,
    approved: 120,
    declined: 5,
  },
  {
    id: "c-2",
    fullName: "Carlos Mendoza",
    username: "cmendoza_ranger",
    submissions: 91,
    approved: 80,
    declined: 7,
  },
  {
    id: "c-3",
    fullName: "Maria Santos",
    username: "msantos_field",
    submissions: 84,
    approved: 73,
    declined: 8,
  },
  {
    id: "c-4",
    fullName: "Bea Alcantara",
    username: "bea_ecowatch",
    submissions: 67,
    approved: 56,
    declined: 8,
  },
  {
    id: "c-5",
    fullName: "Mateo Dela Cruz",
    username: "mdelacruz",
    submissions: 42,
    approved: 38,
    declined: 3,
  },
  {
    id: "c-6",
    fullName: "Lea Villanueva",
    username: "lea_tracks",
    submissions: 35,
    approved: 30,
    declined: 4,
  },
];

export function mockTopContributors(
  range: AnalyticsRange,
  limit: number,
): ContributorStats[] {
  return [...contributors]
    .sort((a, b) => b.submissions - a.submissions)
    .slice(0, limit)
    .map((contributor) => ({
      ...contributor,
      submissions: scale(contributor.submissions, range),
      approved: scale(contributor.approved, range),
      declined: scale(contributor.declined, range),
    }));
}

const declineReasonCounts: Record<DeclineReason, number> = {
  inaccurateSpecies: 146,
  lowQualityPhoto: 100,
  domesticSpecimen: 69,
  duplicateSighting: 46,
  inaccurateLocation: 23,
};

export function mockModerationActivity(
  range: AnalyticsRange,
): ModerationActivity {
  return {
    reviewers: [
      { reviewerName: "HQ Sector 7", decisions: scale(1786, range) },
      { reviewerName: "Field Desk Visayas", decisions: scale(1168, range) },
      { reviewerName: "Dr. Elena Ward", decisions: scale(480, range) },
    ],
    declineReasonCounts: scaleAll(declineReasonCounts, range),
  };
}
