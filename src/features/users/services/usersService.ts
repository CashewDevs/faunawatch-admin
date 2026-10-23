import {
  queryUsers,
  type AdminUser,
  type UserRole,
  type UserListQuery,
  type UserPage,
  type UserStats,
} from "../models/adminUser";
import { mockUserStats, mockUsers } from "./mockUsers";

/**
 * Users Service: loads users and user statistics for the admin site.
 *
 * TODO(schema): Currently serves in-memory mock data. Replace with Supabase
 * queries (search, status filter, sort, and range-based pagination done
 * server-side, plus a count/aggregate query for stats) once the users
 * table, its status column, and the admin RLS policies are defined by the
 * mobile app/backend. Map rows to AdminUser here.
 */

const mockLatencyMs = 300;

/** In-memory copy so role changes persist for the session. */
let users: readonly AdminUser[] = mockUsers;

function withMockLatency<T>(value: T): Promise<T> {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve(value);
    }, mockLatencyMs),
  );
}

export function fetchUsers(query: UserListQuery): Promise<UserPage> {
  return withMockLatency(queryUsers(users, query));
}

export function fetchUserStats(): Promise<UserStats> {
  return withMockLatency(mockUserStats);
}

/**
 * Sets a user's role and returns the updated user.
 *
 * TODO(schema): Replace with a Supabase update once the users table and its
 * role column exist. The backend (RLS policy or Edge Function) must check
 * that the caller is an admin; hiding this control in the UI is not enough.
 */
export function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<AdminUser> {
  const user = users.find((candidate) => candidate.id === userId);
  if (!user) {
    return Promise.reject(new Error(`User not found: ${userId}`));
  }
  const updated: AdminUser = { ...user, role };
  users = users.map((candidate) =>
    candidate.id === userId ? updated : candidate,
  );
  return withMockLatency(updated);
}
