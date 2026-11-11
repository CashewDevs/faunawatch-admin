import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSuspensionErrorKind } from "../models/suspension";
import { reactivateUser, suspendUser } from "./suspensionService";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("../../../core/services/supabaseClient", () => ({
  supabase: { rpc },
}));

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: null, error: null });
});

describe("suspendUser", () => {
  it("calls admin_suspend_user with the trimmed reason and days", async () => {
    await suspendUser("user-1", "  Spam: posted ads ", 7);

    expect(rpc).toHaveBeenCalledWith("admin_suspend_user", {
      p_user_id: "user-1",
      p_reason: "Spam: posted ads",
      p_days: 7,
    });
  });

  it("passes null days for until reactivated", async () => {
    await suspendUser("user-1", "Spam", null);
    expect(rpc).toHaveBeenCalledWith(
      "admin_suspend_user",
      expect.objectContaining({ p_days: null }),
    );
  });

  it("refuses a blank or too-long reason without calling the server", async () => {
    await expect(suspendUser("user-1", "  ", 7)).rejects.toThrow();
    await expect(suspendUser("user-1", "a".repeat(501), 7)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["FW403", "isAdmin"],
    ["FW409", "alreadySuspended"],
    ["FW404", "notFound"],
    ["42501", "forbidden"],
    [undefined, "failed"],
  ])("turns error code %s into %s", async (code, kind) => {
    rpc.mockResolvedValue({ data: null, error: { code, message: "x" } });

    const error: unknown = await suspendUser("user-1", "Spam", 7).catch(
      (caught: unknown) => caught,
    );
    expect(getSuspensionErrorKind(error)).toBe(kind);
  });
});

describe("reactivateUser", () => {
  it("calls admin_reactivate_user", async () => {
    await reactivateUser("user-1");
    expect(rpc).toHaveBeenCalledWith("admin_reactivate_user", {
      p_user_id: "user-1",
    });
  });

  it("reads FW409 as not suspended", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "FW409", message: "user_not_suspended" },
    });

    const error: unknown = await reactivateUser("user-1").catch(
      (caught: unknown) => caught,
    );
    expect(getSuspensionErrorKind(error)).toBe("notSuspended");
  });
});
