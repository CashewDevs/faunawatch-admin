import type { AdminUser } from "../../features/users/models/adminUser";

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

const suspendedUsernames = new Set(["klip123", "migs_t"]);
const verifiedUsernames = new Set(["thorne_botanist"]);

export const testUsers: readonly AdminUser[] = people.map(
  ([fullName, username, joinedAt, postCount], index) => ({
    id: `test-user-${String(index + 1)}`,
    fullName,
    username,
    email: `${username.replace(/[^a-z0-9]/g, ".")}@example.org`,
    joinedAt: `${joinedAt}T08:00:00+00:00`,
    postCount,
    status: suspendedUsernames.has(username) ? "suspended" : "active",
    isVerified: verifiedUsernames.has(username),
    avatar: null,
  }),
);
