import { AppAssets } from "../constants/appAssets";
import { AppStrings } from "../constants/appStrings";

const iconButtonClass =
  "flex items-center justify-center rounded-full p-1 transition-colors hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-primary";

/**
 * Sticky top bar: admin badge, notifications, and the signed-in admin.
 */
export function AdminHeader() {
  const strings = AppStrings.layout;

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between bg-white/90 px-8 shadow-header backdrop-blur-[6px]">
      <span className="rounded-full bg-badge-navy px-2 py-0.5 text-[11px] leading-[14px] font-bold tracking-[1.1px] text-badge-text uppercase">
        {strings.adminBadge}
      </span>

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
              {strings.profileName.charAt(0)}
            </span>
            <div className="flex flex-col">
              <span className="text-xs leading-[15px] font-semibold tracking-[0.24px] text-ink">
                {strings.profileName}
              </span>
              <span className="text-xs leading-[18px] text-slate">
                {strings.profileRole}
              </span>
            </div>
          </div>
          {/* TODO(auth): Sign out through the auth Service once Supabase auth exists. */}
          <button
            type="button"
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
