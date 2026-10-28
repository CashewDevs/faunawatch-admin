import { queryOptions } from "@tanstack/react-query";
import type { SessionUser } from "../models/authSession";
import { fetchAdminProfile } from "../services/authService";

/**
 * Shared admin-check query, so the login screen and the session provider
 * use one cached request per user. Kept for the whole session; sign-out
 * clears the cache.
 */
export function adminProfileQuery(user: SessionUser) {
  return queryOptions({
    queryKey: ["auth", "adminProfile", user.id],
    queryFn: () => fetchAdminProfile(user),
    staleTime: Infinity,
    retry: false,
  });
}
