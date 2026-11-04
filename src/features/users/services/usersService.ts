import { resolveAvatars } from "../../../core/services/storageService";
import { supabase } from "../../../core/services/supabaseClient";
import { parseAvatarPath } from "../../../core/utils/avatars";
import { getProfileDisplayName } from "../../../core/utils/names";
import type {
  AdminUser,
  SanctionRecord,
  UserCounts,
  UserListQuery,
  UserPage,
} from "../models/adminUser";

/**
 * Users Service: loads pages of users for the User Management screen, the
 * counts and sanctions behind its statistics, and one user's verified flag.
 *
 * These go through admin RPCs because they read emails from auth.users,
 * which the browser can't query directly. The client has no generated types;
 * the row shapes below are the RPCs' `returns table (...)` in the faunawatch
 * repo's migrations.
 */

/** A row from `admin_list_users()`. */
interface AdminListUsersRow {
  user_id: string;
  email: string | null;
  email_confirmed_at: string | null;
  username: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_path: string | null;
  profile_created_at: string;
  report_count: number;
  is_suspended: boolean;
  total_count: number;
}

/** The row from `admin_user_stats()`. */
interface AdminUserStatsRow {
  total_users: number;
  active_users: number;
  suspended_users: number;
  new_this_month: number;
  new_last_month: number;
  new_last_7_days: number;
}

interface SanctionRow {
  user_id: string;
  created_at: string;
}

/**
 * One page of the users matching the query, with uploaded avatars signed for
 * display. A page past the end has no rows, so its total is 0.
 */
export async function fetchUserPage(query: UserListQuery): Promise<UserPage> {
  const result = await supabase.rpc("admin_list_users", {
    p_search: query.search,
    p_status: query.status,
    p_sort: query.sort,
    p_limit: query.pageSize,
    p_offset: (query.page - 1) * query.pageSize,
  });
  if (result.error) {
    throw new Error("Couldn't load users.", { cause: result.error });
  }
  const data: unknown = result.data;
  const rows = (data ?? []) as AdminListUsersRow[];

  const avatars = await resolveAvatars(
    rows.map((row) => parseAvatarPath(row.avatar_path)),
  );
  return {
    users: rows.map((row, index): AdminUser => ({
      id: row.user_id,
      fullName:
        getProfileDisplayName(
          {
            fullName: row.full_name,
            username: row.username,
            displayName: row.display_name,
          },
          row.email,
        ) ?? "",
      username: row.username,
      email: row.email,
      joinedAt: row.profile_created_at,
      postCount: row.report_count,
      status: row.is_suspended ? "suspended" : "active",
      isVerified: row.email_confirmed_at !== null,
      avatar: avatars[index] ?? null,
    })),
    totalCount: rows[0]?.total_count ?? 0,
  };
}

/** Whether a user has confirmed their email. False if they don't exist. */
export async function fetchIsUserVerified(userId: string): Promise<boolean> {
  const result = await supabase.rpc("admin_get_user", { p_user_id: userId });
  if (result.error) {
    throw new Error("Couldn't load user.", { cause: result.error });
  }
  const data: unknown = result.data;
  const rows = (data ?? []) as Pick<AdminListUsersRow, "email_confirmed_at">[];
  return (rows[0]?.email_confirmed_at ?? null) !== null;
}

/** User totals and sign-up counts for the stat cards. */
export async function fetchUserCounts(): Promise<UserCounts> {
  const result = await supabase.rpc("admin_user_stats");
  const data: unknown = result.data;
  const row = (data as AdminUserStatsRow[] | null)?.[0];
  if (result.error || !row) {
    throw new Error("Couldn't load user stats.", { cause: result.error });
  }
  return {
    totalUsers: row.total_users,
    activeUsers: row.active_users,
    suspendedUsers: row.suspended_users,
    newThisMonth: row.new_this_month,
    newLastMonth: row.new_last_month,
    newThisWeek: row.new_last_7_days,
  };
}

/** Suspensions created since `since`, lifted or not. */
export async function fetchSanctionsSince(
  since: Date,
): Promise<SanctionRecord[]> {
  const { data, error } = await supabase
    .from("user_sanctions")
    .select("user_id, created_at")
    .gte("created_at", since.toISOString())
    .overrideTypes<SanctionRow[], { merge: false }>();
  if (error) throw new Error("Couldn't load suspensions.", { cause: error });

  return data.map((row) => ({
    userId: row.user_id,
    createdAt: row.created_at,
  }));
}
