import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  getActiveRate,
  getStatsMonthStart,
  getUserStats,
} from "../models/adminUser";
import { fetchSanctionsSince, fetchUsers } from "../services/usersService";

/** Every user. Shared by User Management and the Analytics overview. */
export const allUsersQuery = queryOptions({
  queryKey: ["users", "all"],
  queryFn: fetchUsers,
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
 * The user stat cards' figures, worked out from the user list and this
 * month's suspensions. Undefined until both have loaded.
 */
export function useUserStats() {
  const users = useQuery(allUsersQuery).data;
  const sanctions = useQuery(recentSanctionsQuery).data;
  const stats = useMemo(
    () =>
      users && sanctions
        ? getUserStats(users, sanctions.sanctions, sanctions.now)
        : undefined,
    [users, sanctions],
  );
  return { stats, activeRate: stats ? getActiveRate(stats) : 0 };
}
