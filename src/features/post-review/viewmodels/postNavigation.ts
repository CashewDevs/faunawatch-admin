import { AppRoutes } from "../../../core/constants/appRoutes";

/**
 * Router state carried from the post list into a post's review page, so
 * "Back to Post Approvals" returns to the same tab, filters, and page.
 */
export interface PostLinkState {
  from: string;
}

export function toPostLinkState(
  pathname: string,
  search: string,
): PostLinkState {
  return { from: `${pathname}${search}` };
}

/** The list URL to go back to; the plain list when state is missing. */
export function getReturnPath(state: unknown): string {
  if (
    typeof state === "object" &&
    state !== null &&
    "from" in state &&
    typeof state.from === "string" &&
    (state.from === AppRoutes.posts ||
      state.from.startsWith(`${AppRoutes.posts}?`))
  ) {
    return state.from;
  }
  return AppRoutes.posts;
}
