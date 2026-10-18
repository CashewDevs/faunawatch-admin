import { describe, expect, it } from "vitest";
import {
  defaultUserListQuery,
  getActiveRate,
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
    avatarUrl: null,
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
