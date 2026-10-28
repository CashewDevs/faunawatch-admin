import { AppRoutes } from "../core/constants/appRoutes";

/**
 * Where to send an admin after logging in: back to the page they asked for
 * before being redirected to the login screen.
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

/**
 * Reads the return path from router state. Only same-site paths are
 * accepted ("//evil.example" is protocol-relative), and never the login
 * page itself; anything else falls back to the default admin screen.
 */
export function getReturnPath(state: unknown): string {
  const returnTo =
    typeof state === "object" && state !== null && "returnTo" in state
      ? state.returnTo
      : undefined;
  const isSafe =
    typeof returnTo === "string" &&
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//") &&
    !returnTo.startsWith(AppRoutes.login);
  return isSafe ? returnTo : AppRoutes.users;
}
