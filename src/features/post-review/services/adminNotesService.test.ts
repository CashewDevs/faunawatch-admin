import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminNoteMaxLength } from "../models/adminNote";
import { addAdminNote, fetchAdminNotes } from "./adminNotesService";

const { from, getSession } = vi.hoisted(() => ({
  from: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("../../../core/services/supabaseClient", () => ({
  supabase: { from, auth: { getSession } },
}));

const postId = "post-1";
const adminId = "admin-1";

function mockSelect(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    overrideTypes: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  from.mockReturnValue(query);
  return query;
}

describe("fetchAdminNotes", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("loads a post's notes newest first with author names", async () => {
    const query = mockSelect({
      data: [
        {
          id: "n1",
          body: "Older",
          created_at: "2026-11-01T10:00:00Z",
          author_id: adminId,
          author: {
            full_name: "Alex Admin",
            username: "alex",
            display_name: null,
          },
        },
        {
          id: "n2",
          body: "Newer",
          created_at: "2026-11-02T10:00:00Z",
          author_id: null,
          author: null,
        },
        {
          id: "n3",
          body: "No name",
          created_at: "2026-10-30T10:00:00Z",
          author_id: "admin-2",
          author: { full_name: " ", username: null, display_name: null },
        },
      ],
      error: null,
    });

    const notes = await fetchAdminNotes(postId);

    expect(from).toHaveBeenCalledWith("admin_notes");
    expect(query.select).toHaveBeenCalledWith(
      expect.stringContaining("author:profiles!author_id("),
    );
    expect(query.eq).toHaveBeenCalledWith("report_id", postId);
    expect(notes).toEqual([
      {
        id: "n2",
        body: "Newer",
        createdAt: "2026-11-02T10:00:00Z",
        authorId: null,
        authorName: null,
      },
      {
        id: "n1",
        body: "Older",
        createdAt: "2026-11-01T10:00:00Z",
        authorId: adminId,
        authorName: "Alex Admin",
      },
      {
        id: "n3",
        body: "No name",
        createdAt: "2026-10-30T10:00:00Z",
        authorId: "admin-2",
        authorName: null,
      },
    ]);
  });

  it("throws when the query fails", async () => {
    mockSelect({ data: null, error: { message: "denied" } });

    await expect(fetchAdminNotes(postId)).rejects.toThrow(
      "Couldn't load admin notes.",
    );
  });
});

describe("addAdminNote", () => {
  const insert = vi.fn();

  beforeEach(() => {
    from.mockReset();
    insert.mockReset();
    insert.mockResolvedValue({ error: null });
    from.mockReturnValue({ insert });
    getSession.mockResolvedValue({
      data: { session: { user: { id: adminId } } },
    });
  });

  it("inserts the trimmed note as the signed-in admin", async () => {
    await addAdminNote(postId, "  Photo is a pet.  ");

    expect(from).toHaveBeenCalledWith("admin_notes");
    expect(insert).toHaveBeenCalledWith({
      report_id: postId,
      author_id: adminId,
      body: "Photo is a pet.",
    });
  });

  it("refuses blank or too-long notes without calling the server", async () => {
    await expect(addAdminNote(postId, "   ")).rejects.toThrow();
    await expect(
      addAdminNote(postId, "a".repeat(adminNoteMaxLength + 1)),
    ).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });

  it("refuses when nobody is signed in", async () => {
    getSession.mockResolvedValue({ data: { session: null } });

    await expect(addAdminNote(postId, "Note")).rejects.toThrow(
      "Not signed in.",
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it("throws when the insert is rejected", async () => {
    insert.mockResolvedValue({ error: { code: "42501", message: "rls" } });

    await expect(addAdminNote(postId, "Note")).rejects.toThrow(
      "Couldn't save the note.",
    );
  });
});
