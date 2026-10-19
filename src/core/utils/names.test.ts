import { describe, expect, it } from "vitest";
import { getAvatarTone, getInitials } from "./names";

describe("getInitials", () => {
  it("uses the first and last word, skipping titles", () => {
    expect(getInitials("Klip Bautista")).toBe("KB");
    expect(getInitials("Dr. Aris Thorne")).toBe("AT");
    expect(getInitials("Mateo Dela Cruz")).toBe("MC");
    expect(getInitials("Cher")).toBe("C");
  });
});

describe("getAvatarTone", () => {
  it("picks a stable avatar tone", () => {
    expect(getAvatarTone("Clara Soriano")).toBe(getAvatarTone("Clara Soriano"));
    expect(["primary", "amber", "teal"]).toContain(getAvatarTone("Scout_Dan"));
  });
});
