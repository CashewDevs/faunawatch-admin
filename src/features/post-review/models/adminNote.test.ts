import { describe, expect, it } from "vitest";
import {
  adminNoteMaxLength,
  canSaveAdminNote,
  normalizeAdminNote,
  sortAdminNotes,
  type AdminNote,
} from "./adminNote";

const note = (id: string, createdAt: string): AdminNote => ({
  id,
  body: id,
  createdAt,
  authorId: "admin",
  authorName: "Alex",
});

describe("admin notes", () => {
  it("trims a note before saving", () => {
    expect(normalizeAdminNote("  Check the GPS.\n ")).toBe("Check the GPS.");
  });

  it("saves only non-blank notes within the limit", () => {
    expect(canSaveAdminNote("")).toBe(false);
    expect(canSaveAdminNote("   \n ")).toBe(false);
    expect(canSaveAdminNote("Fine")).toBe(true);
    expect(canSaveAdminNote("a".repeat(adminNoteMaxLength))).toBe(true);
    expect(canSaveAdminNote("a".repeat(adminNoteMaxLength + 1))).toBe(false);
    // Surrounding spaces don't count towards the limit.
    expect(canSaveAdminNote(` ${"a".repeat(adminNoteMaxLength)} `)).toBe(true);
  });

  it("sorts newest first", () => {
    const sorted = sortAdminNotes([
      note("old", "2026-11-01T10:00:00Z"),
      note("new", "2026-11-03T10:00:00Z"),
      note("mid", "2026-11-02T10:00:00Z"),
    ]);
    expect(sorted.map((n) => n.id)).toEqual(["new", "mid", "old"]);
  });
});
