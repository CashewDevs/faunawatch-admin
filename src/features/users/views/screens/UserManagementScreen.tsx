import { Pagination } from "../../../../core/components/Pagination";
import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import { userPageSizeOptions } from "../../models/adminUser";
import { useUserManagementViewModel } from "../../viewmodels/useUserManagementViewModel";
import { UserStatsCards } from "../components/UserStatsCards";
import { UserTable } from "../components/UserTable";
import { UserToolbar } from "../components/UserToolbar";

/**
 * User Management: summary stats, search/filter toolbar, and the users table.
 */
export function UserManagementScreen() {
  const viewModel = useUserManagementViewModel();
  const strings = AppStrings.users;

  return (
    <div className="flex flex-1 animate-fade-in flex-col motion-reduce:animate-none">
      <div className="flex flex-wrap items-start justify-between gap-4 px-8 pt-5 pb-2">
        <UserStatsCards
          stats={viewModel.stats}
          activeRate={viewModel.activeRate}
        />
        <button
          type="button"
          onClick={viewModel.exportCsv}
          className="flex items-center gap-1 rounded-xl bg-white px-4 py-2.5 text-sm leading-5 font-semibold tracking-[0.14px] text-navy drop-shadow-xs transition-colors hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-primary"
        >
          <img src={AppAssets.users.iconDownload} alt="" />
          {strings.exportCsv}
        </button>
      </div>

      <UserToolbar viewModel={viewModel} />
      <UserTable viewModel={viewModel} />
      <div className="mt-auto">
        <Pagination
          page={viewModel.page}
          pageCount={viewModel.pageCount}
          pageItems={viewModel.pageItems}
          pageRange={viewModel.pageRange}
          totalCount={viewModel.totalCount}
          pageSize={viewModel.pageSize}
          pageSizeOptions={userPageSizeOptions}
          itemLabel={strings.pagination.users}
          pageSizeLabel={strings.pagination.pageSizeLabel}
          onPageChange={viewModel.goToPage}
          onPageSizeChange={viewModel.changePageSize}
        />
      </div>
    </div>
  );
}
