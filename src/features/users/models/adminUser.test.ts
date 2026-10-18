import { describe, expect, it } from "vitest";
import {
  defaultUserListQuery,
  getActiveRate,
  getInitials,
  getPageCount,
  getPageItems,
  getPageRange,
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

describe("pagination helpers", () => {
  it("counts pages, with at least one", () => {
    expect(getPageCount(0, 10)).toBe(1);
    expect(getPageCount(21, 10)).toBe(3);
  });

  it("returns the shown item range", () => {
    expect(getPageRange(1, 10, 24)).toEqual({ from: 1, to: 10 });
    expect(getPageRange(3, 10, 24)).toEqual({ from: 21, to: 24 });
    expect(getPageRange(1, 10, 0)).toEqual({ from: 0, to: 0 });
  });

  it("lists every page when there are few", () => {
    expect(getPageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses gaps into ellipses", () => {
    expect(getPageItems(1, 16)).toEqual([1, 2, 3, "ellipsis", 16]);
    expect(getPageItems(8, 16)).toEqual([
      1,
      "ellipsis",
      7,
      8,
      9,
      "ellipsis",
      16,
    ]);
    expect(getPageItems(16, 16)).toEqual([1, "ellipsis", 14, 15, 16]);
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

describe("getInitials", () => {
  it("uses the first and last word, skipping titles", () => {
    expect(getInitials("Klip Bautista")).toBe("KB");
    expect(getInitials("Dr. Aris Thorne")).toBe("AT");
    expect(getInitials("Mateo Dela Cruz")).toBe("MC");
    expect(getInitials("Cher")).toBe("C");
  });
});
