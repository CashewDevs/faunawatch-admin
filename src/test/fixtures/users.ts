import type {
  AdminUser,
  UserCounts,
  UserListQuery,
  UserPage,
} from "../../features/users/models/adminUser";

/**
 * Fictional users for tests. Every name and address is made up
 * (example.org domains).
 */

const people: ReadonlyArray<
  [fullName: string, username: string, joinedAt: string, postCount: number]
> = [
  ["Maria Santos", "msantos_field", "2023-09-12", 84],
  ["Mateo Dela Cruz", "mdelacruz", "2023-11-03", 42],
  ["Dr. Aris Thorne", "thorne_botanist", "2024-01-15", 129],
  ["Klip Bautista", "klip123", "2024-03-22", 3],
  ["Bea Alcantara", "bea_ecowatch", "2024-04-08", 67],
  ["Jose Rizalino Reyes", "jr_reyes", "2024-04-19", 12],
  ["Ana Villanueva", "ana.birds", "2024-05-02", 31],
  ["Paolo Mendoza", "paolo_wild", "2024-05-27", 8],
  ["Liza Navarro", "lizanav", "2024-06-11", 55],
  ["Carlos Ramos", "cramos_ranger", "2024-06-30", 19],
  ["Isabel Cruz", "isa_herps", "2024-07-14", 23],
  ["Miguel Torres", "migs_t", "2024-08-01", 2],
  ["Grace Lim", "gracelim", "2024-08-22", 47],
  ["Rafael Garcia", "raf_garcia", "2024-09-09", 6],
  ["Sofia Aquino", "sofia.aq", "2024-09-30", 38],
  ["Daniel Castillo", "dcastillo", "2024-10-17", 0],
  ["Hannah Flores", "hannah_f", "2024-11-05", 14],
  ["Nico Bautista", "nicob", "2024-11-26", 71],
  ["Patricia Gomez", "trish_g", "2024-12-12", 9],
  ["Leo Fernandez", "leo_fern", "2025-01-08", 26],
  ["Camille Ortiz", "cam_ortiz", "2025-02-03", 4],
  ["Ramon Salazar", "ramon_s", "2025-02-25", 17],
  ["Julia Santiago", "jules_sant", "2025-03-18", 52],
  ["Enzo Morales", "enzo_m", "2025-04-06", 1],
];

/** Active suspensions: reason, and end (null = until reactivated). */
const suspensions = new Map<string, [reason: string, until: string | null]>([
  ["klip123", ["Spam: posted ads in comments", null]],
  ["migs_t", ["Harassment or abuse", "2026-12-01T08:00:00+00:00"]],
]);
const verifiedUsernames = new Set(["thorne_botanist"]);
const adminUsernames = new Set(["ramon_s"]);

export const testUsers: readonly AdminUser[] = people.map(
  ([fullName, username, joinedAt, postCount], index) => ({
    id: `test-user-${String(index + 1)}`,
    fullName,
    username,
    email: `${username.replace(/[^a-z0-9]/g, ".")}@example.org`,
    joinedAt: `${joinedAt}T08:00:00+00:00`,
    postCount,
    status: suspensions.has(username) ? "suspended" : "active",
    isVerified: verifiedUsernames.has(username),
    avatar: null,
    isAdmin: adminUsernames.has(username),
    suspensionReason: suspensions.get(username)?.[0] ?? null,
    suspendedUntil: suspensions.get(username)?.[1] ?? null,
  }),
);

const suspendedCount = testUsers.filter(
  (user) => user.status === "suspended",
).length;

/** What `admin_user_stats()` reports for the test users. */
export const testUserCounts: UserCounts = {
  totalUsers: testUsers.length,
  activeUsers: testUsers.length - suspendedCount,
  suspendedUsers: suspendedCount,
  newThisMonth: 0,
  newLastMonth: 0,
  newThisWeek: 0,
};

/** Stands in for `admin_list_users()`: search, filter, sort, then one page. */
export function testUserPage(
  query: UserListQuery,
  users: readonly AdminUser[] = testUsers,
): UserPage {
  const term = query.search.toLowerCase();
  const matching = users
    .filter(
      (user) =>
        (query.status === "all" || user.status === query.status) &&
        [user.fullName, user.username, user.email].some((field) =>
          field?.toLowerCase().includes(term),
        ),
    )
    .sort((a, b) => {
      if (query.sort === "name") return a.fullName.localeCompare(b.fullName);
      const order = a.joinedAt.localeCompare(b.joinedAt);
      return query.sort === "oldest" ? order : -order;
    });
  const start = (query.page - 1) * query.pageSize;
  return {
    users: matching.slice(start, start + query.pageSize),
    totalCount: matching.length,
  };
}
