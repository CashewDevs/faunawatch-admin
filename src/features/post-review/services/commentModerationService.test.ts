import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCommentModerationErrorKind } from "../models/commentModeration";
import { moderateComment } from "./commentModerationService";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("../../../core/services/supabaseClient", () => ({
  supabase: { rpc },
}));

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: null, error: null });
});

describe("moderateComment", () => {
  it("removes with the trimmed reason", async () => {
    await moderateComment("c1", "remove", "  Spam link ");
    expect(rpc).toHaveBeenCalledWith("admin_remove_comment", {
      p_comment_id: "c1",
      p_reason: "Spam link",
    });
  });

  it("restores and clears flags by id", async () => {
    await moderateComment("c1", "restore", null);
    await moderateComment("c2", "clearFlag", null);
    expect(rpc).toHaveBeenNthCalledWith(1, "admin_restore_comment", {
      p_comment_id: "c1",
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "admin_clear_comment_flag", {
      p_comment_id: "c2",
    });
  });

  it("refuses to remove without a reason, without calling the server", async () => {
    await expect(moderateComment("c1", "remove", "  ")).rejects.toThrow();
    await expect(moderateComment("c1", "remove", null)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["FW409", "alreadyChanged"],
    ["FW404", "notFound"],
    ["42501", "forbidden"],
    [undefined, "failed"],
  ])("turns error code %s into %s", async (code, kind) => {
    rpc.mockResolvedValue({ data: null, error: { code, message: "x" } });

    const error: unknown = await moderateComment("c1", "restore", null).catch(
      (caught: unknown) => caught,
    );
    expect(getCommentModerationErrorKind(error)).toBe(kind);
  });
});
