import { describe, expect, it } from "vitest";
import { getAvatarTone, getInitials, getProfileDisplayName } from "./names";

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

const noNames = { fullName: null, username: null, displayName: null };

describe("getProfileDisplayName", () => {
  it("prefers the full name", () => {
    expect(
      getProfileDisplayName(
        { fullName: "Maria Santos", username: "msantos", displayName: "M" },
        "maria@example.org",
      ),
    ).toBe("Maria Santos");
  });

  it("falls back to username, then the legacy display name", () => {
    expect(
      getProfileDisplayName(
        { ...noNames, username: "msantos", displayName: "M" },
        null,
      ),
    ).toBe("msantos");
    expect(getProfileDisplayName({ ...noNames, displayName: "M" }, null)).toBe(
      "M",
    );
  });

  it("ignores blank values", () => {
    expect(
      getProfileDisplayName(
        { fullName: "  ", username: "", displayName: null },
        "admin@example.org",
      ),
    ).toBe("admin");
  });

  it("returns null when there is nothing to show", () => {
    expect(getProfileDisplayName(noNames, null)).toBeNull();
  });
});
