import { describe, expect, it } from "vitest";
import { parseAvatarPath } from "./avatars";

describe("parseAvatarPath", () => {
  it("reads a preset", () => {
    expect(parseAvatarPath("preset:bunny")).toEqual({
      kind: "preset",
      name: "bunny",
    });
  });

  it("reads a preset stored as the app's asset path", () => {
    expect(parseAvatarPath("assets/images/grizz.webp")).toEqual({
      kind: "preset",
      name: "grizz",
    });
  });

  it("gives no avatar for an unknown preset", () => {
    expect(parseAvatarPath("preset:dragon")).toBeNull();
    expect(parseAvatarPath("assets/images/dragon.webp")).toBeNull();
  });

  it("treats anything else as an uploaded photo", () => {
    expect(parseAvatarPath("user-1/me.jpg")).toEqual({
      kind: "upload",
      path: "user-1/me.jpg",
    });
  });

  it("gives no avatar for an empty value", () => {
    expect(parseAvatarPath(null)).toBeNull();
    expect(parseAvatarPath("  ")).toBeNull();
  });
});
