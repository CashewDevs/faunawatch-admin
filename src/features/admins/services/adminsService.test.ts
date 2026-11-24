import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAdminActionErrorKind,
  isInviteExpired,
  toAdminMember,
} from "../models/adminMember";
import {
  cancelInvite,
  inviteAdmin,
  listAdmins,
  removeAdmin,
  resendInvite,
} from "./adminsService";

const rpc = vi.hoisted(() => vi.fn());
const invoke = vi.hoisted(() => vi.fn());

vi.mock("../../../core/services/supabaseClient", () => ({
  supabase: { rpc, functions: { invoke } },
}));

beforeEach(() => {
  rpc.mockReset();
  invoke.mockReset();
  rpc.mockResolvedValue({ data: null, error: null });
});

function httpError(code: string): FunctionsHttpError {
  return new FunctionsHttpError(
    new Response(JSON.stringify({ error: code }), { status: 409 }),
  );
}

async function kindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "none";
  } catch (error) {
    return getAdminActionErrorKind(error);
  }
}

const row = {
  user_id: "u1",
  email: "a@b.co",
  display_name: "  ",
  status: "invited",
  invited_at: "2026-11-24T10:00:00Z",
  last_sign_in_at: null,
  added_at: "2026-11-24T10:00:00Z",
  is_you: false,
};

describe("admin members", () => {
  it("reads a row of admin_list_admins()", () => {
    const member = toAdminMember(row);
    expect(member).toMatchObject({
      userId: "u1",
      email: "a@b.co",
      name: null,
      status: "invited",
      isYou: false,
    });
    expect(member.invitedAt?.toISOString()).toBe("2026-11-24T10:00:00.000Z");
  });

  it("an invitation expires after an hour", () => {
    const member = toAdminMember(row);
    expect(isInviteExpired(member, new Date("2026-11-24T10:59:00Z"))).toBe(
      false,
    );
    expect(isInviteExpired(member, new Date("2026-11-24T11:00:00Z"))).toBe(
      true,
    );
    expect(
      isInviteExpired({ ...member, status: "active" }, new Date("2027-01-01")),
    ).toBe(false);
  });
});

describe("listAdmins and removeAdmin", () => {
  it("lists admins", async () => {
    rpc.mockResolvedValue({ data: [row], error: null });
    const admins = await listAdmins();
    expect(rpc).toHaveBeenCalledWith("admin_list_admins");
    expect(admins.map((admin) => admin.email)).toEqual(["a@b.co"]);
  });

  it("a non-admin may not list", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "x" },
    });
    expect(await kindOf(listAdmins())).toBe("notAllowed");
  });

  it("removes through admin_remove_admin and explains refusals", async () => {
    await removeAdmin("u2");
    expect(rpc).toHaveBeenCalledWith("admin_remove_admin", { p_user_id: "u2" });

    const refusals = {
      cannot_remove_yourself: "cannotRemoveYourself",
      last_admin: "lastAdmin",
      invite_pending: "invitePending",
      not_an_admin: "notAdmin",
      something_else: "unknown",
    };
    for (const [message, kind] of Object.entries(refusals)) {
      rpc.mockResolvedValue({ data: null, error: { code: "FW409", message } });
      expect(await kindOf(removeAdmin("u2"))).toBe(kind);
    }
  });
});

describe("manage-admins", () => {
  it("invites with the trimmed email and this site's accept-invite page", async () => {
    invoke.mockResolvedValue({ data: { result: "invited" }, error: null });
    expect(await inviteAdmin("  new@b.co ")).toBe("invited");
    expect(invoke).toHaveBeenCalledWith("manage-admins", {
      body: {
        action: "invite",
        email: "new@b.co",
        redirectTo: `${window.location.origin}/accept-invite`,
      },
    });
  });

  it("a removed admin's email restores access", async () => {
    invoke.mockResolvedValue({ data: { result: "restored" }, error: null });
    expect(await inviteAdmin("old@b.co")).toBe("restored");
  });

  it("resends and cancels by account", async () => {
    invoke.mockResolvedValue({ data: { result: "resent" }, error: null });
    await resendInvite("u3");
    expect(invoke).toHaveBeenLastCalledWith("manage-admins", {
      body: {
        action: "resend",
        userId: "u3",
        redirectTo: `${window.location.origin}/accept-invite`,
      },
    });
    invoke.mockResolvedValue({ data: { result: "cancelled" }, error: null });
    await cancelInvite("u3");
    expect(invoke).toHaveBeenLastCalledWith("manage-admins", {
      body: { action: "cancel", userId: "u3" },
    });
  });

  it("turns the function's codes into kinds", async () => {
    const codes = {
      has_account: "hasAccount",
      already_admin: "alreadyAdmin",
      already_invited: "alreadyInvited",
      not_invited: "notInvited",
      invalid_email: "invalidEmail",
      not_admin: "notAllowed",
      rate_limited: "rateLimited",
      failed: "unknown",
    };
    for (const [code, kind] of Object.entries(codes)) {
      invoke.mockResolvedValue({ data: null, error: httpError(code) });
      expect(await kindOf(inviteAdmin("x@b.co"))).toBe(kind);
    }
  });

  it("no connection", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new TypeError("Failed to fetch")),
    });
    expect(await kindOf(cancelInvite("u3"))).toBe("network");
  });
});
