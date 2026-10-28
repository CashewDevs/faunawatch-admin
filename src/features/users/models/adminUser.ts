/**
 * User Management domain model: the user shape the admin site displays,
 * list query options, and pure list and statistics helpers.
 *
 * The users Service maps `admin_list_users()` rows to this shape. Admin
 * rights are not shown or edited here: they live in `admin_users`, which
 * only the Supabase dashboard changes.
 */

import type { AvatarImage } from "../../../core/utils/avatars";
import { paginate } from "../../../core/utils/pagination";

export type UserStatus = "active" | "suspended";

export type UserStatusFilter = "all" | UserStatus;

export type UserSortOption = "newest" | "oldest" | "name";

export interface AdminUser {
  id: string;
  /** Best available name (full name, username, …); empty when none. */
  fullName: string;
  username: string | null;
  email: string | null;
  /** ISO 8601 date-time the account was created. */
  joinedAt: string;
  postCount: number;
  status: UserStatus;
  /** The user has confirmed their email address. */
  isVerified: boolean;
  avatar: AvatarImage | null;
}

/** When an admin suspended a user. */
export interface SanctionRecord {
  userId: string;
  /** ISO 8601 date-time. */
  createdAt: string;
}

export interface UserListQuery {
  search: string;
  status: UserStatusFilter;
  sort: UserSortOption;
  /** 1-based page number. */
  page: number;
  pageSize: number;
}

export interface UserPage {
  users: AdminUser[];
  /** Users matching the search and status filter, across all pages. */
  totalCount: number;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  newThisMonth: number;
  newThisWeek: number;
  suspendedThisMonth: number;
  /**
   * Percent change of new users vs last month (e.g. 18 for +18%), or null
   * when nobody joined last month.
   */
  newUsersChangePercent: number | null;
}

export const userPageSizeOptions = [10, 25, 50] as const;

export const defaultUserListQuery: UserListQuery = {
  search: "",
  status: "all",
  sort: "newest",
  page: 1,
  pageSize: userPageSizeOptions[0],
};

/** Case-insensitive match on name, username, or email. */
export function matchesUserSearch(user: AdminUser, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return [user.fullName, user.username, user.email].some((field) =>
    field?.toLowerCase().includes(term),
  );
}

function byJoinDate(a: AdminUser, b: AdminUser): number {
  return Date.parse(a.joinedAt) - Date.parse(b.joinedAt);
}

export function sortUsers(
  users: readonly AdminUser[],
  sort: UserSortOption,
): AdminUser[] {
  const sorted = [...users];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => byJoinDate(b, a));
    case "oldest":
      return sorted.sort(byJoinDate);
    case "name":
      return sorted.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }
}

/** Applies search, status filter, sort, and pagination to a user list. */
export function queryUsers(
  users: readonly AdminUser[],
  query: UserListQuery,
): UserPage {
  const matching = users.filter(
    (user) =>
      (query.status === "all" || user.status === query.status) &&
      matchesUserSearch(user, query.search),
  );
  return {
    users: paginate(
      sortUsers(matching, query.sort),
      query.page,
      query.pageSize,
    ),
    totalCount: matching.length,
  };
}

/** Active users as a percentage of all users, to one decimal place. */
export function getActiveRate(stats: UserStats): number {
  if (stats.totalUsers === 0) return 0;
  return Math.round((stats.activeUsers / stats.totalUsers) * 1000) / 10;
}

const dayMs = 86_400_000;

/** Start of the UTC calendar month `offset` months from `now`'s month. */
function monthStart(now: Date, offset = 0): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1);
}

/** Start of the current UTC month, for loading this month's sanctions. */
export function getStatsMonthStart(now: Date): Date {
  return new Date(monthStart(now));
}

/**
 * Summary figures for the stat cards. Months are UTC calendar months (as
 * the table's dates are); "this week" is the last 7 days.
 */
export function getUserStats(
  users: readonly AdminUser[],
  sanctions: readonly SanctionRecord[],
  now: Date,
): UserStats {
  const thisMonth = monthStart(now);
  const lastMonth = monthStart(now, -1);
  const weekAgo = now.getTime() - 7 * dayMs;
  const joined = users.map((user) => Date.parse(user.joinedAt));
  const newThisMonth = joined.filter((time) => time >= thisMonth).length;
  const newLastMonth = joined.filter(
    (time) => time >= lastMonth && time < thisMonth,
  ).length;
  const suspendedUsers = users.filter(
    (user) => user.status === "suspended",
  ).length;
  const suspendedThisMonth = new Set(
    sanctions
      .filter((sanction) => Date.parse(sanction.createdAt) >= thisMonth)
      .map((sanction) => sanction.userId),
  ).size;

  return {
    totalUsers: users.length,
    activeUsers: users.length - suspendedUsers,
    suspendedUsers,
    newThisMonth,
    newThisWeek: joined.filter((time) => time >= weekAgo).length,
    suspendedThisMonth,
    newUsersChangePercent:
      newLastMonth === 0
        ? null
        : Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100),
  };
}
