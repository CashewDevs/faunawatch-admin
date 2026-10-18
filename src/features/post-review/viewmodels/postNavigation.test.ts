import { describe, expect, it } from "vitest";
import { getReturnPath, toPostLinkState } from "./postNavigation";

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
});
