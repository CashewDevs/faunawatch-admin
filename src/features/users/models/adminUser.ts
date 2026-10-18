/**
 * User Management domain model: the user shape the admin site displays,
 * list query options, and pure list helpers.
 *
 * TODO(schema): Field names here are the admin site's presentation model,
 * not database columns. Map Supabase rows to this shape in the users
 * Service once the mobile app's schema exists.
 */

export type UserStatus = "active" | "suspended";

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
  const start = (query.page - 1) * query.pageSize;
  return {
    users: sortUsers(matching, query.sort).slice(start, start + query.pageSize),
    totalCount: matching.length,
  };
}

export function getPageCount(totalCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

/** 1-based inclusive range of items shown on a page, e.g. { from: 1, to: 10 }. */
export function getPageRange(
  page: number,
  pageSize: number,
  totalCount: number,
): { from: number; to: number } {
  if (totalCount === 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from, to: Math.min(page * pageSize, totalCount) };
}

export type PageItem = number | "ellipsis";

/**
 * Page buttons to show: the first and last page, the current page and its
 * neighbours, with ellipses for gaps. E.g. page 1 of 16 → 1 2 3 … 16.
 */
export function getPageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  if (page <= 2) pages.add(3);
  if (page >= pageCount - 1) pages.add(pageCount - 2);

  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];
  sorted.forEach((value, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && value - previous > 1) items.push("ellipsis");
    items.push(value);
  });
  return items;
}

/** Active users as a percentage of all users, to one decimal place. */
export function getActiveRate(stats: UserStats): number {
  if (stats.totalUsers === 0) return 0;
  return Math.round((stats.activeUsers / stats.totalUsers) * 1000) / 10;
}

/** Up to two initials from a full name, e.g. "Klip Bautista" → "KB". */
export function getInitials(fullName: string): string {
  const words = fullName
    .split(/\s+/)
    .filter((word) => word && !word.endsWith("."));
  const letters = words.length > 1 ? [words[0], words.at(-1)] : words;
  return letters
    .map((word) => word?.charAt(0) ?? "")
    .join("")
    .toUpperCase();
}
