/**
 * Application route definitions for FaunaWatch Admin.
 */
export const AppRoutes = {
  login: "/login",
  resetPassword: "/reset-password",
  users: "/users",
  posts: "/posts",
  postDetail: "/posts/:postId",
  analytics: "/analytics",
} as const;

export type AppRoute = (typeof AppRoutes)[keyof typeof AppRoutes];

/** URL of one post's review page, e.g. "/posts/mock-post-1042". */
export function postDetailPath(postId: string): string {
  return `${AppRoutes.posts}/${encodeURIComponent(postId)}`;
}
