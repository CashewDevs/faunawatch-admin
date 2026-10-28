import { Navigate, Outlet, useLocation } from "react-router";
import { LoadingScreen } from "../core/components/LoadingScreen";
import { AppRoutes } from "../core/constants/appRoutes";
import { AppStrings } from "../core/constants/appStrings";
import { useAuthSession } from "../features/auth/viewmodels/authSessionContext";
import { getReturnPath, toReturnPathState } from "./returnPath";

/**
 * Admin-only routes. Signed-out visitors go to the login screen, which
 * sends them back here afterwards.
 *
 * This is a UX convenience only: RLS and is_admin() enforce admin access.
 */
export function RequireAdmin() {
  const { status } = useAuthSession();
  const { pathname, search } = useLocation();

  if (status === "signedIn") return <Outlet />;
  if (status === "signedOut") {
    return (
      <Navigate
        to={AppRoutes.login}
        replace
        state={toReturnPathState(pathname, search)}
      />
    );
  }
  return <LoadingScreen label={AppStrings.common.loading} />;
}

/**
 * The login screen. A signed-in admin is sent on to the dashboard. While a
 * new sign-in is being verified the form stays mounted, so a "not an
 * admin" error is still visible afterwards.
 */
export function RedirectIfSignedIn() {
  const { status } = useAuthSession();
  // Router state is untyped; getReturnPath validates it.
  const state: unknown = useLocation().state;

  if (status === "signedIn") {
    return <Navigate to={getReturnPath(state)} replace />;
  }
  if (status === "loading") {
    return <LoadingScreen label={AppStrings.common.loading} />;
  }
  return <Outlet />;
}
