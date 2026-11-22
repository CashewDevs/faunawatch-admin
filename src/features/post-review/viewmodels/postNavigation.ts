import { AppRoutes } from "../../../core/constants/appRoutes";

/**
 * Router state carried from the post list (or the Map) into a post's review
 * page, so "Back" returns to the same tab, filters, and page, or to the
 * same map view with the post's card open.
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

/** The screens a post's review page can go back to. */
export type PostReturnSection = "posts" | "map";

const returnSections: readonly PostReturnSection[] = ["posts", "map"];

const sectionRoutes: Record<PostReturnSection, string> = {
  posts: AppRoutes.posts,
  map: AppRoutes.map,
};

function isOnRoute(path: string, route: string): boolean {
  return path === route || path.startsWith(`${route}?`);
}

/**
 * The screen to go back to and its URL; the plain Post Approvals list when
 * state is missing or points anywhere else.
 */
export function getReturnTarget(state: unknown): {
  path: string;
  section: PostReturnSection;
} {
  if (
    typeof state === "object" &&
    state !== null &&
    "from" in state &&
    typeof state.from === "string"
  ) {
    const from = state.from;
    const section = returnSections.find((candidate) =>
      isOnRoute(from, sectionRoutes[candidate]),
    );
    if (section) return { path: from, section };
  }
  return { path: AppRoutes.posts, section: "posts" };
}

/** The URL to go back to; the plain list when state is missing. */
export function getReturnPath(state: unknown): string {
  return getReturnTarget(state).path;
}
