import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModerationError } from "../models/moderation";
import { decidePosts } from "./moderationService";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("../../../core/services/supabaseClient", () => ({
  supabase: { rpc },
}));

const ids = ["post-1", "post-2"];

describe("decidePosts", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: null });
  });

  it("approves without a reason", async () => {
    await decidePosts(ids, "approve", null);

    expect(rpc).toHaveBeenCalledWith("admin_decide_report", {
      p_report_ids: ids,
      p_decision: "approved",
      p_decline_reason: null,
    });
  });

  it("ignores a reason passed with approve", async () => {
    await decidePosts(ids, "approve", "duplicateSighting");

    expect(rpc).toHaveBeenCalledWith(
      "admin_decide_report",
      expect.objectContaining({ p_decline_reason: null }),
    );
  });

  it("declines with the reason's enum value", async () => {
    await decidePosts(ids, "decline", "inaccurateLocation");

    expect(rpc).toHaveBeenCalledWith("admin_decide_report", {
      p_report_ids: ids,
      p_decision: "declined",
      p_decline_reason: "inaccurate_gps",
    });
  });

  it("takes down through its own RPC, so a stale decline can't", async () => {
    await decidePosts(["post-1"], "takeDown", "inappropriateContent");

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("admin_take_down_report", {
      p_report_id: "post-1",
      p_decline_reason: "inappropriate_content",
    });
  });

  it("takes down one post at a time", async () => {
    await expect(
      decidePosts(ids, "takeDown", "inappropriateContent"),
    ).rejects.toThrow("Take down one post at a time.");
    await expect(
      decidePosts([], "takeDown", "inappropriateContent"),
    ).rejects.toThrow("Take down one post at a time.");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps a rejected take down like a decision", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "FW409", message: "report_not_approved" },
    });

    await expect(
      decidePosts(["post-1"], "takeDown", "duplicateSighting"),
    ).rejects.toMatchObject({ kind: "alreadyDecided" });
  });

  it("refuses a decline without a reason before calling the server", async () => {
    await expect(decidePosts(ids, "decline", null)).rejects.toThrow(
      "A decline reason is required.",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["FW409", "alreadyDecided"],
    ["FW404", "notFound"],
    ["42501", "forbidden"],
    ["PGRST000", "failed"],
  ])("throws a ModerationError for code %s", async (code, kind) => {
    const error = { code, message: "rejected", details: null, hint: null };
    rpc.mockResolvedValue({ data: null, error });

    const result = decidePosts(ids, "approve", null);

    await expect(result).rejects.toBeInstanceOf(ModerationError);
    await expect(result).rejects.toMatchObject({ kind, cause: error });
  });
});
