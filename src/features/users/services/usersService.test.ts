import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAvatars } from "../../../core/services/storageService";
import { defaultUserListQuery } from "../models/adminUser";
import {
  fetchIsUserVerified,
  fetchSanctionsSince,
  fetchUserCounts,
  fetchUserPage,
} from "./usersService";

const rpc = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());

vi.mock("../../../core/services/supabaseClient", () => ({
  supabase: { rpc, from },
}));

vi.mock("../../../core/services/storageService", () => ({
  resolveAvatars: vi.fn(),
}));

const resolveAvatarsMock = vi.mocked(resolveAvatars);

function mockRpc(result: { data: unknown; error: unknown }) {
  rpc.mockResolvedValue(result);
}

const row = {
  user_id: "user-1",
  email: "maria@example.org",
  email_confirmed_at: "2024-01-01T00:00:00+00:00",
  username: "msantos",
  full_name: "Maria Santos",
  display_name: null,
  avatar_path: "preset:bunny",
  profile_created_at: "2023-09-12T08:00:00+00:00",
  report_count: 84,
  is_suspended: false,
  suspension_reason: null,
  total_count: 37,
};

beforeEach(() => {
  vi.clearAllMocks();
  resolveAvatarsMock.mockImplementation((avatars) =>
    Promise.resolve(
      avatars.map((avatar) =>
        avatar?.kind === "upload"
          ? { kind: "photo", url: `https://signed/${avatar.path}` }
          : (avatar ?? null),
      ),
    ),
  );
});

describe("fetchUserPage", () => {
  it("passes the query to admin_list_users as a page offset", async () => {
    mockRpc({ data: [row], error: null });

    await fetchUserPage({
      search: "maria",
      status: "suspended",
      sort: "name",
      page: 3,
      pageSize: 25,
    });

    expect(rpc).toHaveBeenCalledWith("admin_list_users", {
      p_search: "maria",
      p_status: "suspended",
      p_sort: "name",
      p_limit: 25,
      p_offset: 50,
    });
  });

  it("maps rows to users and reads the total from them", async () => {
    mockRpc({
      data: [
        row,
        {
          ...row,
          user_id: "user-2",
          email: "nameless@example.org",
          email_confirmed_at: null,
          username: null,
          full_name: null,
          avatar_path: "user-2/photo.jpg",
          report_count: 0,
          is_suspended: true,
          suspension_reason: "Spam",
        },
      ],
      error: null,
    });

    const page = await fetchUserPage(defaultUserListQuery);

    expect(page.totalCount).toBe(37);
    expect(page.users).toEqual([
      {
        id: "user-1",
        fullName: "Maria Santos",
        username: "msantos",
        email: "maria@example.org",
        joinedAt: "2023-09-12T08:00:00+00:00",
        postCount: 84,
        status: "active",
        isVerified: true,
        avatar: { kind: "preset", name: "bunny" },
      },
      {
        id: "user-2",
        // Falls back to the part of the email before the "@".
        fullName: "nameless",
        username: null,
        email: "nameless@example.org",
        joinedAt: "2023-09-12T08:00:00+00:00",
        postCount: 0,
        status: "suspended",
        isVerified: false,
        avatar: { kind: "photo", url: "https://signed/user-2/photo.jpg" },
      },
    ]);
  });

  it("leaves the name empty when there is nothing to show", async () => {
    mockRpc({
      data: [{ ...row, email: null, username: null, full_name: null }],
      error: null,
    });
    const { users } = await fetchUserPage(defaultUserListQuery);
    expect(users[0]?.fullName).toBe("");
  });

  it("has a total of 0 without rows", async () => {
    mockRpc({ data: [], error: null });
    await expect(fetchUserPage(defaultUserListQuery)).resolves.toEqual({
      users: [],
      totalCount: 0,
    });
  });

  it("throws when the RPC fails", async () => {
    mockRpc({ data: null, error: { message: "permission denied" } });
    await expect(fetchUserPage(defaultUserListQuery)).rejects.toThrow(
      "Couldn't load users.",
    );
  });
});

describe("fetchIsUserVerified", () => {
  it("reads the user's email confirmation from admin_get_user", async () => {
    mockRpc({ data: [row], error: null });

    await expect(fetchIsUserVerified("user-1")).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith("admin_get_user", {
      p_user_id: "user-1",
    });
  });

  it("is false for an unconfirmed email or a missing user", async () => {
    mockRpc({ data: [{ ...row, email_confirmed_at: null }], error: null });
    await expect(fetchIsUserVerified("user-1")).resolves.toBe(false);

    mockRpc({ data: [], error: null });
    await expect(fetchIsUserVerified("missing")).resolves.toBe(false);
  });

  it("throws when the RPC fails", async () => {
    mockRpc({ data: null, error: { message: "permission denied" } });
    await expect(fetchIsUserVerified("user-1")).rejects.toThrow(
      "Couldn't load user.",
    );
  });
});

describe("fetchUserCounts", () => {
  it("maps the admin_user_stats row", async () => {
    mockRpc({
      data: [
        {
          total_users: 10,
          active_users: 8,
          suspended_users: 2,
          new_this_month: 3,
          new_last_month: 4,
          new_last_7_days: 1,
        },
      ],
      error: null,
    });

    await expect(fetchUserCounts()).resolves.toEqual({
      totalUsers: 10,
      activeUsers: 8,
      suspendedUsers: 2,
      newThisMonth: 3,
      newLastMonth: 4,
      newThisWeek: 1,
    });
    expect(rpc).toHaveBeenCalledWith("admin_user_stats");
  });

  it("throws when the RPC fails or returns nothing", async () => {
    mockRpc({ data: null, error: { message: "permission denied" } });
    await expect(fetchUserCounts()).rejects.toThrow(
      "Couldn't load user stats.",
    );

    mockRpc({ data: [], error: null });
    await expect(fetchUserCounts()).rejects.toThrow(
      "Couldn't load user stats.",
    );
  });
});

describe("fetchSanctionsSince", () => {
  function mockSanctions(result: { data: unknown; error: unknown }) {
    const overrideTypes = vi.fn().mockResolvedValue(result);
    const gte = vi.fn().mockReturnValue({ overrideTypes });
    const select = vi.fn().mockReturnValue({ gte });
    from.mockReturnValue({ select });
    return { select, gte };
  }

  it("loads sanctions created since the date", async () => {
    const { select, gte } = mockSanctions({
      data: [{ user_id: "user-2", created_at: "2026-10-05T00:00:00+00:00" }],
      error: null,
    });

    const sanctions = await fetchSanctionsSince(
      new Date("2026-10-01T00:00:00Z"),
    );

    expect(from).toHaveBeenCalledWith("user_sanctions");
    expect(select).toHaveBeenCalledWith("user_id, created_at");
    expect(gte).toHaveBeenCalledWith("created_at", "2026-10-01T00:00:00.000Z");
    expect(sanctions).toEqual([
      { userId: "user-2", createdAt: "2026-10-05T00:00:00+00:00" },
    ]);
  });

  it("throws when the query fails", async () => {
    mockSanctions({ data: null, error: { message: "denied" } });
    await expect(fetchSanctionsSince(new Date())).rejects.toThrow(
      "Couldn't load suspensions.",
    );
  });
});
