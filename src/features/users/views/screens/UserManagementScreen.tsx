import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import { formatNumber } from "../../../../core/utils/formatters";
import { useUserManagementViewModel } from "../../viewmodels/useUserManagementViewModel";
import { UserStatsCards } from "../components/UserStatsCards";
import { UserTable } from "../components/UserTable";
import { UserTablePagination } from "../components/UserTablePagination";
import { UserToolbar } from "../components/UserToolbar";

/**
 * User Management: summary stats, search/filter toolbar, and the users table.
 */
export function UserManagementScreen() {
  const viewModel = useUserManagementViewModel();
  const strings = AppStrings.users;

  return (
    <div className="flex flex-1 animate-fade-in flex-col motion-reduce:animate-none">
      <div className="flex flex-col gap-4 px-8 pt-9 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-[28px] leading-[44px] font-extrabold tracking-[-0.7px] text-navy">
                {strings.heading}
              </h1>
              {viewModel.stats && (
                <span className="rounded-full bg-chip px-2.5 py-0.5 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-navy">
                  {formatNumber(viewModel.stats.totalUsers)}{" "}
                  {strings.registeredSuffix}
                </span>
              )}
            </div>
            <p className="max-w-[440px] text-sm leading-5 text-muted">
              {strings.description}
            </p>
          </div>
          <button
            type="button"
            onClick={viewModel.exportCsv}
            className="flex items-center gap-1 rounded-xl bg-white px-4 py-2.5 text-sm leading-5 font-semibold tracking-[0.14px] text-navy drop-shadow-xs transition-colors hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-primary"
          >
            <img src={AppAssets.users.iconDownload} alt="" />
            {strings.exportCsv}
          </button>
        </div>

        <UserStatsCards
          stats={viewModel.stats}
          activeRate={viewModel.activeRate}
        />
      </div>

      <UserToolbar viewModel={viewModel} />
      <UserTable viewModel={viewModel} />
      <div className="mt-auto">
        <UserTablePagination viewModel={viewModel} />
      </div>
    </div>
  );
}
