import { describe, expect, it } from "vitest";
import { getInitials } from "./names";

describe("getInitials", () => {
  it("uses the first and last word, skipping titles", () => {
    expect(getInitials("Klip Bautista")).toBe("KB");
    expect(getInitials("Dr. Aris Thorne")).toBe("AT");
    expect(getInitials("Mateo Dela Cruz")).toBe("MC");
    expect(getInitials("Cher")).toBe("C");
  });
});
