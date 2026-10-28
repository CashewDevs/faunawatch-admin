import { resolveAvatars } from "../../../core/services/storageService";
import { supabase } from "../../../core/services/supabaseClient";
import { parseAvatarPath } from "../../../core/utils/avatars";
import { getProfileDisplayName } from "../../../core/utils/names";
import type { AdminUser, SanctionRecord } from "../models/adminUser";

/**
 * Users Service: loads every user for the User Management screen and the
 * sanctions behind its statistics.
 *
 * `admin_list_users()` returns all users at once (it reads emails from
 * auth.users, which the browser can't query directly), so search, filter,
 * sort and paging happen in the Model.
 * TODO(schema): Fine at prototype scale. For thousands of users, the RPC
 * needs search, filter and paging parameters.
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
}

interface SanctionRow {
  user_id: string;
  created_at: string;
}

/** Every user, with uploaded avatars signed for display. */
export async function fetchUsers(): Promise<AdminUser[]> {
  const result = await supabase.rpc("admin_list_users");
  if (result.error) {
    throw new Error("Couldn't load users.", { cause: result.error });
  }
  const data: unknown = result.data;
  // The client has no generated types; the row shape is the RPC's
  // `returns table (...)` in the faunawatch repo's migrations.
  const rows = (data ?? []) as AdminListUsersRow[];

  const avatars = await resolveAvatars(
    rows.map((row) => parseAvatarPath(row.avatar_path)),
  );
  return rows.map((row, index) => ({
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
  }));
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
