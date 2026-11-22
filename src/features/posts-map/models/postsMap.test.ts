import { describe, expect, it } from "vitest";
import { testPosts } from "../../../test/fixtures/posts";
import type { PostSummary } from "../../post-review/models/post";
import {
  countMapPosts,
  defaultPostsMapQuery,
  getMappablePosts,
  getMapStatuses,
  getSpeciesName,
  getVisiblePosts,
  hasValidCoordinates,
  parsePostsMapParams,
  toggleHiddenStatus,
  toPostsMapParams,
} from "./postsMap";

function postAt(index: number): PostSummary {
  const post = testPosts[index];
  if (!post) throw new Error(`No test post ${String(index)}`);
  return post;
}

const withoutChanges = getMapStatuses(false);
const withChanges = getMapStatuses(true);

describe("getMapStatuses", () => {
  it("offers Changes requested only when Request changes is on", () => {
    expect(withoutChanges).toEqual(["pending", "approved", "declined"]);
    expect(withChanges).toEqual([
      "pending",
      "changes_requested",
      "approved",
      "declined",
    ]);
  });

  it("returns the same array each time", () => {
    expect(getMapStatuses(false)).toBe(withoutChanges);
    expect(getMapStatuses(true)).toBe(withChanges);
  });
});

describe("hasValidCoordinates", () => {
  it("accepts real spots and rejects broken ones", () => {
    expect(hasValidCoordinates({ latitude: 9.85, longitude: 124.2 })).toBe(
      true,
    );
    expect(hasValidCoordinates({ latitude: -90, longitude: 180 })).toBe(true);
    expect(hasValidCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
    expect(hasValidCoordinates({ latitude: 0, longitude: -181 })).toBe(false);
    expect(hasValidCoordinates({ latitude: Number.NaN, longitude: 0 })).toBe(
      false,
    );
  });
});

describe("getMappablePosts", () => {
  const changes: PostSummary = { ...postAt(0), id: "changes" };
  changes.status = "changes_requested";
  const unknown: PostSummary = { ...postAt(1), id: "unknown" };
  unknown.status = "unknown";
  const broken: PostSummary = {
    ...postAt(2),
    id: "broken",
    latitude: Number.NaN,
  };

  it("leaves out unknown statuses and broken locations", () => {
    const ids = getMappablePosts(
      [postAt(3), unknown, broken],
      withoutChanges,
    ).map((post) => post.id);
    expect(ids).toEqual([postAt(3).id]);
  });

  it("maps Changes requested only when it's offered", () => {
    expect(getMappablePosts([changes], withoutChanges)).toEqual([]);
    expect(getMappablePosts([changes], withChanges)).toEqual([changes]);
  });
});

describe("filters and counts", () => {
  const mappable = getMappablePosts(testPosts, withoutChanges);

  it("counts pins per status", () => {
    // The fixture: 18 pending, 7 approved, 5 declined.
    expect(countMapPosts(mappable)).toEqual({
      pending: 18,
      changes_requested: 0,
      approved: 7,
      declined: 5,
    });
  });

  it("hides switched-off statuses", () => {
    const visible = getVisiblePosts(mappable, ["pending", "declined"]);
    expect(visible).toHaveLength(7);
    expect(visible.every((post) => post.status === "approved")).toBe(true);
    expect(getVisiblePosts(mappable, [])).toHaveLength(30);
  });

  it("switches a status off and back on", () => {
    expect(toggleHiddenStatus([], "approved")).toEqual(["approved"]);
    expect(toggleHiddenStatus(["approved", "pending"], "approved")).toEqual([
      "pending",
    ]);
  });
});

describe("getSpeciesName", () => {
  it("prefers the AI's match, then the reporter's name", () => {
    const post = postAt(0);
    expect(getSpeciesName(post)).toBe("Philippine Tarsier");
    expect(getSpeciesName({ ...post, aiMatch: null })).toBe("Tarsier");
    expect(
      getSpeciesName({ ...post, aiMatch: null, reporterSpecies: null }),
    ).toBeNull();
  });
});

describe("map address-bar state", () => {
  it("reads the defaults from an empty address", () => {
    expect(parsePostsMapParams(new URLSearchParams(), withoutChanges)).toEqual(
      defaultPostsMapQuery,
    );
    expect(toPostsMapParams(defaultPostsMapQuery).toString()).toBe("");
  });

  it("round-trips filters, view and the open card", () => {
    const query = {
      hidden: ["approved", "declined"] as const,
      view: "2d" as const,
      postId: "abc",
    };
    const params = toPostsMapParams({ ...query, hidden: [...query.hidden] });
    expect(params.toString()).toBe("hide=approved%2Cdeclined&view=2d&post=abc");
    expect(parsePostsMapParams(params, withoutChanges)).toEqual({
      ...query,
      hidden: ["approved", "declined"],
    });
  });

  it("ignores unknown, unoffered and repeated values", () => {
    const params = new URLSearchParams(
      "hide=declined,nonsense,changes_requested,declined,pending&view=4d&post=%20",
    );
    expect(parsePostsMapParams(params, withoutChanges)).toEqual({
      hidden: ["pending", "declined"],
      view: "3d",
      postId: null,
    });
  });
});
