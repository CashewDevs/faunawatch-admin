import {
  queryUsers,
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

function withMockLatency<T>(value: T): Promise<T> {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve(value);
    }, mockLatencyMs),
  );
}

export function fetchUsers(query: UserListQuery): Promise<UserPage> {
  return withMockLatency(queryUsers(mockUsers, query));
}

export function fetchUserStats(): Promise<UserStats> {
  return withMockLatency(mockUserStats);
}
