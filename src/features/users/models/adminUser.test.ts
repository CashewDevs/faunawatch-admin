import { describe, expect, it } from "vitest";
import {
  defaultUserListQuery,
  getActiveRate,
  getStatsMonthStart,
  getUserStats,
  matchesUserSearch,
  queryUsers,
  sortUsers,
  type AdminUser,
} from "./adminUser";

function makeUser(overrides: Partial<AdminUser>): AdminUser {
  return {
    id: "id",
    fullName: "Test User",
    username: "test",
    email: "test@example.org",
    joinedAt: "2024-01-01",
    postCount: 0,
    status: "active",
    isVerified: false,
    avatar: null,
    ...overrides,
  };
}

const maria = makeUser({
  id: "1",
  fullName: "Maria Santos",
  username: "msantos_field",
  email: "maria@example.org",
  joinedAt: "2023-09-12",
});
const klip = makeUser({
  id: "2",
  fullName: "Klip Bautista",
  username: "klip123",
  email: "klip@example.org",
  joinedAt: "2024-03-22",
  status: "suspended",
});
const bea = makeUser({
  id: "3",
  fullName: "Bea Alcantara",
  username: "bea_ecowatch",
  email: "bea@example.org",
  joinedAt: "2024-04-08",
});
const users = [maria, klip, bea];

describe("matchesUserSearch", () => {
  it("matches name, username, or email case-insensitively", () => {
    expect(matchesUserSearch(maria, "SANTOS")).toBe(true);
    expect(matchesUserSearch(maria, "field")).toBe(true);
    expect(matchesUserSearch(maria, "maria@")).toBe(true);
    expect(matchesUserSearch(maria, "klip")).toBe(false);
  });

  it("skips a missing username or email", () => {
    const anonymous = makeUser({ username: null, email: null });
    expect(matchesUserSearch(anonymous, "test user")).toBe(true);
    expect(matchesUserSearch(anonymous, "example")).toBe(false);
  });

  it("matches everything for a blank search", () => {
    expect(matchesUserSearch(maria, "   ")).toBe(true);
  });
});

describe("sortUsers", () => {
  it("sorts by newest, oldest, and name without mutating the input", () => {
    expect(sortUsers(users, "newest").map((u) => u.id)).toEqual([
      "3",
      "2",
      "1",
    ]);
    expect(sortUsers(users, "oldest").map((u) => u.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(sortUsers(users, "name").map((u) => u.id)).toEqual(["3", "2", "1"]);
    expect(users.map((u) => u.id)).toEqual(["1", "2", "3"]);
  });
});

describe("queryUsers", () => {
  it("filters by status and search, then pages", () => {
    expect(
      queryUsers(users, { ...defaultUserListQuery, status: "suspended" }),
    ).toEqual({ users: [klip], totalCount: 1 });

    const page2 = queryUsers(users, {
      ...defaultUserListQuery,
      sort: "oldest",
      page: 2,
      pageSize: 2,
    });
    expect(page2).toEqual({ users: [bea], totalCount: 3 });

    expect(
      queryUsers(users, { ...defaultUserListQuery, search: "nobody" }),
    ).toEqual({ users: [], totalCount: 0 });
  });
});

describe("getActiveRate", () => {
  it("returns the active percentage to one decimal", () => {
    const stats = {
      totalUsers: 1420,
      activeUsers: 1386,
      suspendedUsers: 34,
      newThisMonth: 89,
      newThisWeek: 12,
      suspendedThisMonth: 3,
      newUsersChangePercent: 18,
    };
    expect(getActiveRate(stats)).toBe(97.6);
    expect(getActiveRate({ ...stats, totalUsers: 0, activeUsers: 0 })).toBe(0);
  });
});

describe("getUserStats", () => {
  const now = new Date("2026-10-29T12:00:00Z");
  const joined = (id: string, joinedAt: string, suspended = false) =>
    makeUser({
      id,
      joinedAt,
      status: suspended ? "suspended" : "active",
    });

  it("counts users, suspensions and new sign-ups", () => {
    const stats = getUserStats(
      [
        joined("1", "2026-10-27T00:00:00Z"),
        joined("2", "2026-10-02T00:00:00Z", true),
        joined("3", "2026-09-15T00:00:00Z"),
        joined("4", "2026-09-30T23:59:59Z"),
        joined("5", "2025-01-01T00:00:00Z", true),
      ],
      [
        { userId: "2", createdAt: "2026-10-05T00:00:00Z" },
        { userId: "2", createdAt: "2026-10-06T00:00:00Z" },
        { userId: "5", createdAt: "2026-09-20T00:00:00Z" },
      ],
      now,
    );

    expect(stats).toEqual({
      totalUsers: 5,
      activeUsers: 3,
      suspendedUsers: 2,
      newThisMonth: 2,
      newThisWeek: 1,
      // One user suspended twice this month counts once.
      suspendedThisMonth: 1,
      newUsersChangePercent: 0,
    });
  });

  it("works out the change against last month", () => {
    const stats = getUserStats(
      [
        joined("1", "2026-10-01T00:00:00Z"),
        joined("2", "2026-10-02T00:00:00Z"),
        joined("3", "2026-10-03T00:00:00Z"),
        joined("4", "2026-09-03T00:00:00Z"),
        joined("5", "2026-09-04T00:00:00Z"),
      ],
      [],
      now,
    );
    expect(stats.newUsersChangePercent).toBe(50);
  });

  it("has no change figure when nobody joined last month", () => {
    const stats = getUserStats([joined("1", "2026-10-01T00:00:00Z")], [], now);
    expect(stats.newUsersChangePercent).toBeNull();
  });

  it("starts the stats month on the 1st, in UTC", () => {
    expect(getStatsMonthStart(now).toISOString()).toBe(
      "2026-10-01T00:00:00.000Z",
    );
  });
});
