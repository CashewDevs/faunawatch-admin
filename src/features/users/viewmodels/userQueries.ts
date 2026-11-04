import {
  keepPreviousData,
  queryOptions,
  skipToken,
  useQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";
import {
  getActiveRate,
  getStatsMonthStart,
  getUserStats,
  type UserListQuery,
} from "../models/adminUser";
import {
  fetchIsUserVerified,
  fetchSanctionsSince,
  fetchUserCounts,
  fetchUserPage,
} from "../services/usersService";

/** One page of users; the current page stays visible while the next loads. */
export function userPageQuery(query: UserListQuery) {
  return queryOptions({
    queryKey: ["users", "page", query],
    queryFn: () => fetchUserPage(query),
    placeholderData: keepPreviousData,
  });
}

/** Whether a user has confirmed their email; waits until the id is known. */
export function userVerifiedQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["users", "verified", userId],
    queryFn: userId ? () => fetchIsUserVerified(userId) : skipToken,
  });
}

const userCountsQuery = queryOptions({
  queryKey: ["users", "counts"],
  queryFn: fetchUserCounts,
});

// The stats are measured from the moment the sanctions were loaded.
const recentSanctionsQuery = queryOptions({
  queryKey: ["users", "sanctions"],
  queryFn: async () => {
    const now = new Date();
    const sanctions = await fetchSanctionsSince(getStatsMonthStart(now));
    return { now, sanctions };
  },
});

/**
 * The user stat cards' figures, worked out from the user counts and this
 * month's suspensions. Undefined until both have loaded. Shared by User
 * Management and the Analytics overview.
 */
export function useUserStats() {
  const counts = useQuery(userCountsQuery).data;
  const sanctions = useQuery(recentSanctionsQuery).data;
  const stats = useMemo(
    () =>
      counts && sanctions
        ? getUserStats(counts, sanctions.sanctions, sanctions.now)
        : undefined,
    [counts, sanctions],
  );
  return { stats, activeRate: stats ? getActiveRate(stats) : 0 };
}
