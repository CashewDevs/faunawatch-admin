import { AppRoutes } from "../../../core/constants/appRoutes";

/**
 * Where to send an admin after logging in: back to the page they asked for
 * before being redirected to the login screen.
 *
 * The guard passes it to the login screen in router state. Google sign-in
 * leaves the site and comes back with a fresh page, which drops router
 * state, so the login screen also saves it for that round trip.
 */

export interface ReturnPathState {
  returnTo: string;
}

export function toReturnPathState(
  pathname: string,
  search: string,
): ReturnPathState {
  return { returnTo: `${pathname}${search}` };
}

/** The `returnTo` value in router state, not yet validated. */
export function readReturnTo(state: unknown): unknown {
  return typeof state === "object" && state !== null && "returnTo" in state
    ? state.returnTo
    : undefined;
}

/**
 * Only same-site paths are accepted ("//evil.example" is
 * protocol-relative), and never the login page itself.
 */
export function isSafeReturnPath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith(AppRoutes.login)
  );
}

/**
 * The page to return to: the one in router state, else one saved before a
 * Google sign-in, else the default admin screen.
 */
export function getReturnPath(
  state: unknown,
  savedPath: string | null = null,
): string {
  const fromState = readReturnTo(state);
  if (isSafeReturnPath(fromState)) return fromState;
  if (isSafeReturnPath(savedPath)) return savedPath;
  return AppRoutes.users;
}
