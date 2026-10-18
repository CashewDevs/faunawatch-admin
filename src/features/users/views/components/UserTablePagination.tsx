import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import { formatNumber } from "../../../../core/utils/formatters";
import { userPageSizeOptions } from "../../models/adminUser";
import type { UserManagementViewModel } from "../../viewmodels/useUserManagementViewModel";

interface UserTablePaginationProps {
  viewModel: UserManagementViewModel;
}

const pageButtonClass =
  "flex size-8 items-center justify-center rounded-lg text-xs leading-4 tracking-[0.24px] focus-visible:outline-2 focus-visible:outline-primary";

/**
 * Table footer: result range, page-size picker, and page buttons.
 */
export function UserTablePagination({ viewModel }: UserTablePaginationProps) {
  const strings = AppStrings.users.pagination;
  const { page, pageCount, pageItems, pageRange, totalCount } = viewModel;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-tint/40 px-4 py-3.5">
      <div className="flex items-center gap-4">
        <p className="text-xs leading-[18px] text-muted" aria-live="polite">
          {strings.showing}{" "}
          <span className="font-bold text-navy">
            {pageRange.from}-{pageRange.to}
          </span>{" "}
          {strings.of}{" "}
          <span className="font-bold text-navy">
            {formatNumber(totalCount)}
          </span>{" "}
          {strings.users}
        </p>
        <label className="flex items-center gap-1.5 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-muted">
          {strings.show}
          <select
            aria-label={strings.pageSizeLabel}
            value={viewModel.pageSize}
            onChange={(event) => {
              viewModel.changePageSize(Number(event.target.value));
            }}
            className="cursor-pointer appearance-none rounded-lg bg-white py-1 pr-6 pl-3 text-[11px] leading-[13px] font-semibold tracking-[0.44px] text-navy focus:outline-2 focus:outline-primary"
          >
            {userPageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} {strings.perPage}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav aria-label={strings.label} className="flex items-center gap-1">
        <button
          type="button"
          aria-label={strings.previous}
          disabled={page <= 1}
          onClick={() => {
            viewModel.goToPage(page - 1);
          }}
          className={`${pageButtonClass} hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent`}
        >
          <img src={AppAssets.users.iconChevronLeft} alt="" />
        </button>
        {pageItems.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${String(index)}`}
              className="px-1 text-xs leading-4 font-semibold tracking-[0.24px] text-slate"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`${strings.page} ${String(item)}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => {
                viewModel.goToPage(item);
              }}
              className={`${pageButtonClass} ${
                item === page
                  ? "bg-navy font-bold text-white drop-shadow-xs"
                  : "font-semibold text-navy hover:bg-white"
              }`}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label={strings.next}
          disabled={page >= pageCount}
          onClick={() => {
            viewModel.goToPage(page + 1);
          }}
          className={`${pageButtonClass} hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent`}
        >
          <img src={AppAssets.users.iconChevronRight} alt="" />
        </button>
      </nav>
    </div>
  );
}
