import { NavLink } from "react-router";
import { AppAssets } from "../constants/appAssets";
import { AppRoutes } from "../constants/appRoutes";
import { AppStrings } from "../constants/appStrings";
import { BrandLogomark } from "./BrandLogomark";

const navItems = [
  {
    to: AppRoutes.users,
    label: AppStrings.layout.navUsers,
    icon: AppAssets.shared.iconUsers,
  },
  {
    to: AppRoutes.posts,
    label: AppStrings.layout.navPosts,
    icon: AppAssets.shared.iconPostApprovals,
  },
] as const;

/**
 * Fixed blue sidebar with the brand block and the main navigation.
 */
export function AdminSidebar() {
  const strings = AppStrings.layout;

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col gap-6 bg-brand-blue py-6 drop-shadow-sidebar">
      <div className="flex items-center gap-2 px-6">
        <BrandLogomark />
        <div className="flex flex-col">
          <span className="text-base leading-5 font-semibold tracking-[-0.4px] text-accent-yellow">
            {strings.brandName}
          </span>
          <span className="text-[11px] leading-[14px] font-bold tracking-[0.55px] text-sidebar-text uppercase opacity-70">
            {strings.consoleLabel}
          </span>
        </div>
      </div>

      <nav aria-label={strings.navLabel} className="flex flex-col gap-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                "flex items-center gap-2 rounded-lg px-4 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-yellow",
                isActive
                  ? "bg-primary text-base leading-6 font-normal text-white shadow-nav-active"
                  : "text-xs leading-4 font-semibold tracking-[0.24px] text-sidebar-text hover:bg-white/10",
              ].join(" ")
            }
          >
            <img src={item.icon} alt="" className="shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
