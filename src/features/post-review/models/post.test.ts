import { describe, expect, it } from "vitest";
import {
  countPostsByTab,
  defaultPostListQuery,
  getApprovalRate,
  getExtraPhotoCount,
  getQueuePosition,
  hasActiveFilters,
  matchesPostSearch,
  parsePostListParams,
  queryPosts,
  sortComments,
  sortPosts,
  splitScientificName,
  toPostListParams,
  type PostComment,
  type PostSummary,
} from "./post";

function makePost(overrides: Partial<PostSummary>): PostSummary {
  return {
    id: "id",
    reference: 1000,
    title: "Sighting",
    description: "",
    status: "pending",
    severity: "medium",
    category: "mammal",
    region: "visayas",
    locationName: "Somewhere",
    isInvasive: false,
    submittedAt: "2026-10-18T10:00:00Z",
    photoUrls: ["a.jpg"],
    aiMatch: {
      commonName: "Philippine Tarsier",
      scientificName: "Carlito syrichta",
      confidencePercent: 94.2,
    },
    reporter: {
      id: "r1",
      fullName: "Mateo Dela Cruz",
      username: "mdelacruz",
      role: "Scout Leader",
      avatarUrl: null,
    },
    ...overrides,
  };
}

const tarsier = makePost({
  id: "1",
  submittedAt: "2026-10-18T09:00:00Z",
  photoUrls: ["1.jpg", "2.jpg", "3.jpg", "4.jpg"],
});
const eagle = makePost({
  id: "2",
  title: "Eagle near nest",
  severity: "high",
  category: "bird",
  region: "mindanao",
  submittedAt: "2026-10-18T11:00:00Z",
  aiMatch: {
    commonName: "Philippine Eagle",
    scientificName: "Pithecophaga jefferyi",
    confidencePercent: 98.4,
  },
  reporter: {
    id: "r2",
    fullName: "Jorge Dimaculangan",
    username: "jdimaculangan",
    role: "Senior Ranger",
    avatarUrl: null,
  },
});
const toad = makePost({
  id: "3",
  status: "approved",
  severity: "low",
  category: "amphibian",
  isInvasive: true,
  submittedAt: "2026-10-18T10:00:00Z",
});
const declinedToad = makePost({
  id: "4",
  status: "declined",
  submittedAt: "2026-10-17T10:00:00Z",
});
const posts = [tarsier, eagle, toad, declinedToad];

describe("matchesPostSearch", () => {
  it("matches title, species, reporter, or place case-insensitively", () => {
    expect(matchesPostSearch(eagle, "NEST")).toBe(true);
    expect(matchesPostSearch(eagle, "pithecophaga")).toBe(true);
    expect(matchesPostSearch(eagle, "jorge")).toBe(true);
    expect(matchesPostSearch(eagle, "somewhere")).toBe(true);
    expect(matchesPostSearch(eagle, "tarsier")).toBe(false);
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
    // High first, then medium newest-first, then low.
    expect(sortPosts(posts, "severity").map((p) => p.id)).toEqual([
      "2",
      "1",
      "4",
      "3",
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
    expect(
      queryPosts(posts, { ...query, category: "amphibian" }).posts,
    ).toEqual([toad]);
    expect(queryPosts(posts, { ...query, region: "mindanao" }).posts).toEqual([
      eagle,
    ]);
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
    expect(hasActiveFilters({ ...defaultPostListQuery, region: "luzon" })).toBe(
      true,
    );
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
    expect(getExtraPhotoCount(makePost({ photoUrls: [] }))).toBe(0);
  });

  it("computes the approval rate of decided posts", () => {
    const stats = {
      totalPosts: 42,
      approvedPosts: 39,
      declinedPosts: 3,
      memberSince: "2023-11-03",
      isVerified: true,
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
      region: "luzon" as const,
      page: 3,
      pageSize: 24,
    };
    const params = toPostListParams(query);
    expect(params.toString()).toBe(
      "tab=approved&q=eagle&region=luzon&page=3&size=24",
    );
    expect(parsePostListParams(params)).toEqual(query);
    expect(toPostListParams(defaultPostListQuery).toString()).toBe("");
  });

  it("falls back to defaults for invalid values", () => {
    expect(
      parsePostListParams(
        new URLSearchParams("tab=nope&severity=extreme&page=-2&size=7"),
      ),
    ).toEqual(defaultPostListQuery);
  });
});
