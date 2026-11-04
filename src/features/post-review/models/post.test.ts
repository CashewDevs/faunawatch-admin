import { describe, expect, it } from "vitest";
import {
  countPostsByTab,
  countReporterPosts,
  defaultPostListQuery,
  formatDevice,
  getApprovalRate,
  getDistanceMeters,
  getExifLocationCheck,
  getExtraPhotoCount,
  getObserverDevices,
  getQueuePosition,
  hasActiveFilters,
  humanizeKey,
  matchesPostSearch,
  parsePossibleSpecies,
  parsePostListParams,
  parseValidation,
  pickTopSpecies,
  queryPosts,
  sortComments,
  sortPosts,
  splitScientificName,
  toPostListParams,
  toPostReference,
  toPostSeverity,
  toPostStatus,
  toReportCategory,
  toSpeciesOrigin,
  type PhotoExif,
  type PostComment,
  type PostSummary,
} from "./post";

function makePost(overrides: Partial<PostSummary>): PostSummary {
  return {
    id: "id",
    reference: "ID",
    category: "animal_in_need",
    description: "",
    status: "pending",
    severity: "medium",
    isInvasive: false,
    submittedAt: "2026-10-18T10:00:00Z",
    latitude: 7.05,
    longitude: 125.25,
    placeName: null,
    photoPaths: ["u1/r1/a.jpg"],
    aiMatch: {
      commonName: "Philippine Tarsier",
      scientificName: "Carlito syrichta",
      confidence: "high",
    },
    reporterSpecies: null,
    reporter: {
      id: "r1",
      fullName: "Mateo Dela Cruz",
      username: "mdelacruz",
      storedAvatar: null,
    },
    ...overrides,
  };
}

const tarsier = makePost({
  id: "1",
  reference: "3F2A9C1B",
  submittedAt: "2026-10-18T09:00:00Z",
  photoPaths: ["1.jpg", "2.jpg", "3.jpg", "4.jpg"],
});

const eagle = makePost({
  id: "2",
  description: "Eagle near nest",
  severity: "high",
  category: "potentially_dangerous_animal",
  submittedAt: "2026-10-18T11:00:00Z",
  aiMatch: {
    commonName: "Philippine Eagle",
    scientificName: "Pithecophaga jefferyi",
    confidence: "medium",
  },
  reporterSpecies: "Monkey-eating eagle",
  reporter: {
    id: "r2",
    fullName: "Jorge Dimaculangan",
    username: "jdimaculangan",
    storedAvatar: null,
  },
});

const toad = makePost({
  id: "3",
  status: "approved",
  severity: "low",
  category: "possible_invasive_species",
  isInvasive: true,
  submittedAt: "2026-10-18T10:00:00Z",
});

const declinedToad = makePost({
  id: "4",
  status: "declined",
  severity: "unrated",
  aiMatch: null,
  submittedAt: "2026-10-17T10:00:00Z",
});

const posts = [tarsier, eagle, toad, declinedToad];

describe("database value mappers", () => {
  it("maps the AI's severity levels to card severities", () => {
    expect(toPostSeverity("low")).toBe("low");
    expect(toPostSeverity("moderate")).toBe("medium");
    expect(toPostSeverity("high")).toBe("high");
    expect(toPostSeverity("critical")).toBe("high");
    expect(toPostSeverity("uncertain")).toBe("unrated");
    expect(toPostSeverity(null)).toBe("unrated");
  });

  it("reads statuses, categories, and origins", () => {
    expect(toPostStatus("approved")).toBe("approved");
    expect(toPostStatus("submitted")).toBe("pending");
    expect(toReportCategory("animal_in_need")).toBe("animal_in_need");
    expect(toReportCategory("mammal")).toBeNull();
    expect(toSpeciesOrigin("endemic")).toBe("endemic");
    expect(toSpeciesOrigin(null)).toBeNull();
  });

  it("shortens the report id to a reference", () => {
    expect(toPostReference("3f2a9c1b-0d4e-4b1a-9c3e-1a2b3c4d5e6f")).toBe(
      "3F2A9C1B",
    );
  });
});

describe("AI jsonb parsers", () => {
  it("reads possible species, accepting the older name key", () => {
    expect(
      parsePossibleSpecies([
        {
          common_name: "Philippine Eagle",
          scientific_name: "Pithecophaga jefferyi",
          confidence: "high",
        },
        { name: "Crested Serpent Eagle", confidence: "sometimes" },
        { scientific_name: "No common name", confidence: "low" },
        "not an object",
      ]),
    ).toEqual([
      {
        commonName: "Philippine Eagle",
        scientificName: "Pithecophaga jefferyi",
        confidence: "high",
      },
      {
        commonName: "Crested Serpent Eagle",
        scientificName: "",
        confidence: "uncertain",
      },
    ]);
    expect(parsePossibleSpecies(null)).toEqual([]);
    expect(parsePossibleSpecies({ common_name: "x" })).toEqual([]);
  });

  it("picks the most confident species, keeping stored order on ties", () => {
    const low = {
      commonName: "A",
      scientificName: "",
      confidence: "low" as const,
    };
    const medium1 = { ...low, commonName: "B", confidence: "medium" as const };
    const medium2 = { ...medium1, commonName: "C" };
    expect(pickTopSpecies([low, medium1, medium2])).toBe(medium1);
    expect(pickTopSpecies([])).toBeNull();
  });

  it("reads validation checks, skipping malformed ones", () => {
    expect(
      parseValidation([
        { label: "image_relevant", passed: true },
        { label: "location_consistent", passed: false },
        { label: "safe_content", passed: "yes" },
        { passed: true },
      ]),
    ).toEqual([
      { key: "image_relevant", passed: true },
      { key: "location_consistent", passed: false },
    ]);
    expect(parseValidation(undefined)).toEqual([]);
  });

  it("humanizes unknown keys", () => {
    expect(humanizeKey("location_consistent")).toBe("Location consistent");
    expect(humanizeKey("BLUR-CHECK")).toBe("Blur check");
  });
});

describe("EXIF helpers", () => {
  const exif = (overrides: Partial<PhotoExif>): PhotoExif => ({
    latitude: null,
    longitude: null,
    deviceMake: null,
    deviceModel: null,
    cameraSettings: null,
    flashFired: null,
    ...overrides,
  });
  const report = { latitude: 7.05, longitude: 125.25 };

  it("measures great-circle distance", () => {
    // One degree of latitude is about 111.2 km.
    expect(
      getDistanceMeters(
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 0 },
      ) / 1000,
    ).toBeCloseTo(111.2, 1);
    expect(getDistanceMeters(report, report)).toBe(0);
  });

  it("verifies photo GPS within 500 m of the report", () => {
    const near = { exif: exif({ latitude: 7.054, longitude: 125.25 }) };
    const far = { exif: exif({ latitude: 7.055, longitude: 125.25 }) };
    const noGps = { exif: exif({ latitude: 7.05 }) };
    expect(getExifLocationCheck(report, [near, noGps])).toBe("verified");
    expect(getExifLocationCheck(report, [near, far])).toBe("mismatch");
    expect(getExifLocationCheck(report, [noGps, { exif: null }])).toBe("noGps");
    expect(getExifLocationCheck(report, [])).toBe("noGps");
  });

  it("names the device without repeating the make", () => {
    expect(
      formatDevice(exif({ deviceMake: "Apple", deviceModel: "iPhone 13" })),
    ).toBe("Apple iPhone 13");
    expect(
      formatDevice(exif({ deviceMake: "Canon", deviceModel: "Canon EOS R5" })),
    ).toBe("Canon EOS R5");
    expect(formatDevice(exif({ deviceModel: "Pixel 8" }))).toBe("Pixel 8");
    expect(formatDevice(exif({ deviceMake: " " }))).toBeNull();
  });

  it("lists each distinct observer device once", () => {
    const iphone = exif({ deviceMake: "Apple", deviceModel: "iPhone 13" });
    const canon = exif({ deviceMake: "Canon", deviceModel: "EOS R5" });
    expect(
      getObserverDevices([
        { exif: iphone },
        { exif: canon },
        { exif: iphone },
        { exif: null },
      ]),
    ).toBe("Apple iPhone 13, Canon EOS R5");
    expect(getObserverDevices([{ exif: null }])).toBeNull();
  });
});

describe("matchesPostSearch", () => {
  it("matches description, species, reporter, or reference", () => {
    expect(matchesPostSearch(eagle, "NEST")).toBe(true);
    expect(matchesPostSearch(eagle, "pithecophaga")).toBe(true);
    expect(matchesPostSearch(eagle, "monkey-eating")).toBe(true);
    expect(matchesPostSearch(eagle, "jorge")).toBe(true);
    expect(matchesPostSearch(tarsier, "3f2a")).toBe(true);
    expect(matchesPostSearch(eagle, "tarsier")).toBe(false);
    expect(matchesPostSearch(declinedToad, "tarsier")).toBe(false);
    expect(matchesPostSearch(eagle, "  ")).toBe(true);
  });
});

describe("sortPosts", () => {
  it("sorts by newest, oldest, and severity without mutating", () => {
    expect(sortPosts(posts, "newest").map((p) => p.id)).toEqual([
      "2",
      "3",
      "1",
      "4",
    ]);
    expect(sortPosts(posts, "oldest").map((p) => p.id)).toEqual([
      "4",
      "1",
      "3",
      "2",
    ]);
    // High, medium, low, then unrated last.
    expect(sortPosts(posts, "severity").map((p) => p.id)).toEqual([
      "2",
      "1",
      "3",
      "4",
    ]);
    expect(posts.map((p) => p.id)).toEqual(["1", "2", "3", "4"]);
  });
});

describe("queryPosts", () => {
  it("filters by tab", () => {
    expect(queryPosts(posts, defaultPostListQuery)).toEqual({
      posts: [eagle, tarsier],
      totalCount: 2,
    });
    expect(
      queryPosts(posts, { ...defaultPostListQuery, tab: "all" }).totalCount,
    ).toBe(4);
  });

  it("combines filters and search, then pages", () => {
    const query = { ...defaultPostListQuery, tab: "all" as const };
    expect(
      queryPosts(posts, { ...query, severity: "high" }).posts.map((p) => p.id),
    ).toEqual(["2"]);
    expect(queryPosts(posts, { ...query, severity: "unrated" }).posts).toEqual([
      declinedToad,
    ]);
    expect(
      queryPosts(posts, { ...query, category: "possible_invasive_species" })
        .posts,
    ).toEqual([toad]);
    expect(queryPosts(posts, { ...query, search: "nobody" })).toEqual({
      posts: [],
      totalCount: 0,
    });
    expect(
      queryPosts(posts, { ...query, page: 2, pageSize: 3 }).posts.map(
        (p) => p.id,
      ),
    ).toEqual(["4"]);
  });
});

describe("countPostsByTab", () => {
  it("counts each status and the total", () => {
    expect(countPostsByTab(posts)).toEqual({
      pending: 2,
      approved: 1,
      declined: 1,
      all: 4,
    });
  });
});

describe("hasActiveFilters", () => {
  it("is true only when a dropdown is narrowed", () => {
    expect(hasActiveFilters(defaultPostListQuery)).toBe(false);
    expect(
      hasActiveFilters({ ...defaultPostListQuery, category: "animal_in_need" }),
    ).toBe(true);
    expect(
      hasActiveFilters({ ...defaultPostListQuery, severity: "unrated" }),
    ).toBe(true);
  });
});

describe("getQueuePosition", () => {
  it("places a post in its status queue, newest first", () => {
    expect(getQueuePosition(posts, "1")).toEqual({
      position: 2,
      total: 2,
      previousId: "2",
      nextId: null,
    });
    expect(getQueuePosition(posts, "3")).toEqual({
      position: 1,
      total: 1,
      previousId: null,
      nextId: null,
    });
    expect(getQueuePosition(posts, "missing")).toBeNull();
  });
});

describe("small post helpers", () => {
  it("counts photos beyond the cover", () => {
    expect(getExtraPhotoCount(tarsier)).toBe(3);
    expect(getExtraPhotoCount(eagle)).toBe(0);
    expect(getExtraPhotoCount(makePost({ photoPaths: [] }))).toBe(0);
  });

  it("counts a reporter's posts by status", () => {
    expect(
      countReporterPosts(["approved", "pending", "declined", "approved"]),
    ).toEqual({ totalPosts: 4, approvedPosts: 2, declinedPosts: 1 });
  });

  it("computes the approval rate of decided posts", () => {
    const stats = {
      totalPosts: 42,
      approvedPosts: 39,
      declinedPosts: 3,
      memberSince: "2023-11-03T00:00:00Z",
    };
    expect(getApprovalRate(stats)).toBe(92.9);
    expect(
      getApprovalRate({ ...stats, approvedPosts: 0, declinedPosts: 0 }),
    ).toBe(0);
  });
});

describe("sortComments", () => {
  const comment = (id: string, postedAt: string): PostComment => ({
    id,
    authorName: "A",
    username: "a",
    postedAt,
    body: "",
    isFlagged: false,
    moderationNote: null,
  });
  const comments = [
    comment("old", "2026-10-18T08:00:00Z"),
    comment("new", "2026-10-18T10:00:00Z"),
  ];

  it("sorts newest or oldest first", () => {
    expect(sortComments(comments, "newest").map((c) => c.id)).toEqual([
      "new",
      "old",
    ]);
    expect(sortComments(comments, "oldest").map((c) => c.id)).toEqual([
      "old",
      "new",
    ]);
  });
});

describe("splitScientificName", () => {
  it("marks every occurrence of the scientific name", () => {
    expect(
      splitScientificName(
        "Adult (Carlito syrichta) seen. Carlito syrichta again",
        "Carlito syrichta",
      ),
    ).toEqual([
      { text: "Adult (", isScientificName: false },
      { text: "Carlito syrichta", isScientificName: true },
      { text: ") seen. ", isScientificName: false },
      { text: "Carlito syrichta", isScientificName: true },
      { text: " again", isScientificName: false },
    ]);
  });

  it("returns the text unchanged when the name is absent", () => {
    expect(splitScientificName("No match", "Carlito syrichta")).toEqual([
      { text: "No match", isScientificName: false },
    ]);
  });
});

describe("list URL params", () => {
  it("round-trips a query and omits defaults", () => {
    const query = {
      ...defaultPostListQuery,
      tab: "approved" as const,
      search: "eagle",
      severity: "unrated" as const,
      category: "animal_in_need" as const,
      page: 3,
      pageSize: 24,
    };
    const params = toPostListParams(query);
    expect(params.toString()).toBe(
      "tab=approved&q=eagle&severity=unrated&category=animal_in_need&page=3&size=24",
    );
    expect(parsePostListParams(params)).toEqual(query);
    expect(toPostListParams(defaultPostListQuery).toString()).toBe("");
  });

  it("falls back to defaults for invalid values", () => {
    expect(
      parsePostListParams(
        new URLSearchParams(
          "tab=nope&severity=extreme&category=mammal&page=-2&size=7",
        ),
      ),
    ).toEqual(defaultPostListQuery);
  });
});
