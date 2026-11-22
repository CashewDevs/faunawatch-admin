import { describe, expect, it } from "vitest";
import {
  getReturnPath,
  getReturnTarget,
  toPostLinkState,
} from "./postNavigation";

describe("post navigation state", () => {
  it("returns to the list URL it came from", () => {
    const state = toPostLinkState("/posts", "?tab=approved&page=2");
    expect(getReturnPath(state)).toBe("/posts?tab=approved&page=2");
    expect(getReturnPath(toPostLinkState("/posts", ""))).toBe("/posts");
  });

  it("falls back to the list for missing or foreign state", () => {
    expect(getReturnPath(null)).toBe("/posts");
    expect(getReturnPath({ from: 42 })).toBe("/posts");
    expect(getReturnPath({ from: "/users" })).toBe("/posts");
    expect(getReturnPath({ from: "https://example.org/posts" })).toBe("/posts");
  });

  it("returns to the Map, with its filters and open card", () => {
    const state = toPostLinkState("/map", "?hide=declined&post=abc");
    expect(getReturnTarget(state)).toEqual({
      path: "/map?hide=declined&post=abc",
      section: "map",
    });
    expect(getReturnTarget(toPostLinkState("/map", ""))).toEqual({
      path: "/map",
      section: "map",
    });
  });

  it("treats look-alike paths as foreign", () => {
    expect(getReturnTarget({ from: "/mapping" })).toEqual({
      path: "/posts",
      section: "posts",
    });
    expect(getReturnTarget({ from: "/posts?tab=all" }).section).toBe("posts");
  });
});
