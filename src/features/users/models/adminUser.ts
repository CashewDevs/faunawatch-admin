/**
 * User Management domain model: the user shape the admin site displays,
 * list query options, and pure statistics helpers.
 *
 * The users Service maps `admin_list_users()` rows to this shape; the RPC
 * does the searching, filtering, sorting and paging. Admin
 * rights are not shown or edited here: they live in `admin_users`, which
 * only the Supabase dashboard changes.
 */

import type { AvatarImage } from "../../../core/utils/avatars";

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

/** Totals and sign-ups, from `admin_user_stats()`. */
export interface UserCounts {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  newThisMonth: number;
  newLastMonth: number;
  /** Sign-ups in the last 7 days. */
  newThisWeek: number;
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

/** Active users as a percentage of all users, to one decimal place. */
export function getActiveRate(stats: UserStats): number {
  if (stats.totalUsers === 0) return 0;
  return Math.round((stats.activeUsers / stats.totalUsers) * 1000) / 10;
}

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
 * the table's dates are).
 */
export function getUserStats(
  counts: UserCounts,
  sanctions: readonly SanctionRecord[],
  now: Date,
): UserStats {
  const { newLastMonth, ...totals } = counts;
  const thisMonth = monthStart(now);
  const suspendedThisMonth = new Set(
    sanctions
      .filter((sanction) => Date.parse(sanction.createdAt) >= thisMonth)
      .map((sanction) => sanction.userId),
  ).size;

  return {
    ...totals,
    suspendedThisMonth,
    newUsersChangePercent:
      newLastMonth === 0
        ? null
        : Math.round(
            ((counts.newThisMonth - newLastMonth) / newLastMonth) * 100,
          ),
  };
}
