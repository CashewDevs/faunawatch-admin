/**
 * User Management domain model: the user shape the admin site displays,
 * list query options, and pure list helpers.
 *
 * TODO(schema): Field names here are the admin site's presentation model,
 * not database columns. Map Supabase rows to this shape in the users
 * Service once the mobile app's schema exists.
 */

import { paginate } from "../../../core/utils/pagination";

export type UserStatus = "active" | "suspended";

// TODO(schema): Role names are placeholders agreed for the admin UI. Align
// them with the role values the backend defines once the schema exists.
export const userRoles = ["user", "admin"] as const;

export type UserRole = (typeof userRoles)[number];

export type UserStatusFilter = "all" | UserStatus;

export type UserSortOption = "newest" | "oldest" | "name";

export interface AdminUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  /** ISO 8601 date the account was created. */
  joinedAt: string;
  postCount: number;
  status: UserStatus;
  role: UserRole;
  isVerified: boolean;
  avatarUrl: string | null;
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
  /** Percent change of new users vs last month (e.g. 18 for +18%). */
  newUsersChangePercent: number;
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
    field.toLowerCase().includes(term),
  );
}

export function sortUsers(
  users: readonly AdminUser[],
  sort: UserSortOption,
): AdminUser[] {
  const sorted = [...users];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
    case "oldest":
      return sorted.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
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
