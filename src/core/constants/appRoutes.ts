/**
 * Application route definitions for FaunaWatch Admin.
 */
export const AppRoutes = {
  login: "/login",
  users: "/users",
  posts: "/posts",
  analytics: "/analytics",
} as const;

export type AppRoute = (typeof AppRoutes)[keyof typeof AppRoutes];
