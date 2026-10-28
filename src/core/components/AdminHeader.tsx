import { matchPath, useLocation } from "react-router";
import { AppAssets } from "../constants/appAssets";
import { AppRoutes } from "../constants/appRoutes";
import { AppStrings } from "../constants/appStrings";
import { useAuthSession } from "../../features/auth/viewmodels/authSessionContext";

const iconButtonClass =
  "flex items-center justify-center rounded-full p-1 transition-colors hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-primary";

/** Page title per section; nested routes (post detail) use their section's. */
const pageTitles = [
  { path: AppRoutes.users, title: AppStrings.users.heading },
  { path: AppRoutes.posts, title: AppStrings.posts.heading },
  { path: AppRoutes.analytics, title: AppStrings.analytics.heading },
] as const;

function getPageTitle(pathname: string): string | undefined {
  return pageTitles.find(({ path }) =>
    matchPath({ path, end: false }, pathname),
  )?.title;
}

/**
 * Sticky top bar: the current screen's title, notifications, and the signed-in admin.
 */
export function AdminHeader() {
  const strings = AppStrings.layout;
  const pageTitle = getPageTitle(useLocation().pathname);
  const { admin, signOut } = useAuthSession();
  const adminName = admin?.displayName ?? strings.profileFallbackName;

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between bg-white/90 px-8 shadow-header backdrop-blur-[6px]">
      <h1 className="text-4xl leading-[44px] font-bold tracking-[-0.9px] text-deep-blue">
        {pageTitle}
      </h1>

      <div className="flex items-center gap-6">
        {/* TODO(notifications): No notifications feature is specified yet. */}
        <button
          type="button"
          aria-label={strings.notifications}
          className={`relative ${iconButtonClass}`}
        >
          <img src={AppAssets.shared.iconBell} alt="" />
          <span className="absolute top-1 right-[3.67px] size-2 rounded-full bg-accent-gold" />
        </button>

        <div className="flex items-center gap-4 pl-4">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-full bg-avatar text-xs font-bold text-primary"
            >
              {adminName.charAt(0).toUpperCase()}
            </span>
            <div className="flex flex-col">
              <span className="text-xs leading-[15px] font-semibold tracking-[0.24px] text-ink">
                {adminName}
              </span>
              <span className="text-xs leading-[18px] text-slate">
                {strings.profileRole}
              </span>
            </div>
          </div>
          {/* The route guard returns to the login screen once signed out. */}
          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
            aria-label={strings.logout}
            className={`ml-2 ${iconButtonClass}`}
          >
            <img src={AppAssets.shared.iconLogout} alt="" />
          </button>
        </div>
      </div>
    </header>
  );
}
