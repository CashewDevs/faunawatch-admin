import { describe, expect, it } from "vitest";
import {
  getActiveRate,
  getStatsMonthStart,
  getUserStats,
  type UserCounts,
} from "./adminUser";

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
  const counts: UserCounts = {
    totalUsers: 5,
    activeUsers: 3,
    suspendedUsers: 2,
    newThisMonth: 2,
    newLastMonth: 2,
    newThisWeek: 1,
  };

  it("adds this month's suspensions to the counts", () => {
    const stats = getUserStats(
      counts,
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
      { ...counts, newThisMonth: 3, newLastMonth: 2 },
      [],
      now,
    );
    expect(stats.newUsersChangePercent).toBe(50);
  });

  it("has no change figure when nobody joined last month", () => {
    const stats = getUserStats({ ...counts, newLastMonth: 0 }, [], now);
    expect(stats.newUsersChangePercent).toBeNull();
  });

  it("starts the stats month on the 1st, in UTC", () => {
    expect(getStatsMonthStart(now).toISOString()).toBe(
      "2026-10-01T00:00:00.000Z",
    );
  });
});
