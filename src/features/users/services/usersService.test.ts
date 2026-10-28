import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAvatars } from "../../../core/services/storageService";
import { fetchSanctionsSince, fetchUsers } from "./usersService";

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

describe("fetchUsers", () => {
  it("maps admin_list_users rows to users", async () => {
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

    const users = await fetchUsers();

    expect(rpc).toHaveBeenCalledWith("admin_list_users");
    expect(users).toEqual([
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
    const [user] = await fetchUsers();
    expect(user?.fullName).toBe("");
  });

  it("throws when the RPC fails", async () => {
    mockRpc({ data: null, error: { message: "permission denied" } });
    await expect(fetchUsers()).rejects.toThrow("Couldn't load users.");
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
