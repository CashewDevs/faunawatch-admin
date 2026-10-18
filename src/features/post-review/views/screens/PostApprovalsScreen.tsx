import { Pagination } from "../../../../core/components/Pagination";
import { AppStrings } from "../../../../core/constants/appStrings";
import { postPageSizeOptions } from "../../models/post";
import { usePostApprovalsViewModel } from "../../viewmodels/usePostApprovalsViewModel";
import { BulkActionBar } from "../components/BulkActionBar";
import { PostFilterToolbar } from "../components/PostFilterToolbar";
import { PostGrid } from "../components/PostGrid";
import { PostStatusTabs } from "../components/PostStatusTabs";

/**
 * Post Approvals: status tabs, search and filters, the post card grid,
 * bulk actions for selected posts, and pagination.
 */
export function PostApprovalsScreen() {
  const viewModel = usePostApprovalsViewModel();
  const strings = AppStrings.posts;

  return (
    <div className="flex flex-1 animate-fade-in flex-col motion-reduce:animate-none">
      <div className="flex flex-col gap-3 px-8 pt-5 pb-8">
        <div className="flex flex-col">
          <h1 className="text-4xl leading-[44px] font-bold tracking-[-0.9px] text-deep-blue">
            {strings.heading}
          </h1>
          <p className="text-sm leading-5 text-slate">{strings.description}</p>
        </div>

        <div className="flex flex-col gap-2">
          <PostStatusTabs viewModel={viewModel} />
          <PostFilterToolbar viewModel={viewModel} />
        </div>

        {/* Extra room while the floating bulk bar is open, so the last row
            can scroll clear of it. */}
        <div className={viewModel.selectedCount > 0 ? "pt-3 pb-24" : "pt-3"}>
          <PostGrid viewModel={viewModel} />
        </div>
      </div>

      <BulkActionBar viewModel={viewModel} />

      <div className="mt-auto">
        <Pagination
          page={viewModel.page}
          pageCount={viewModel.pageCount}
          pageItems={viewModel.pageItems}
          pageRange={viewModel.pageRange}
          totalCount={viewModel.totalCount}
          pageSize={viewModel.pageSize}
          pageSizeOptions={postPageSizeOptions}
          itemLabel={strings.pagination.posts}
          pageSizeLabel={strings.pagination.pageSizeLabel}
          onPageChange={viewModel.goToPage}
          onPageSizeChange={viewModel.changePageSize}
        />
      </div>
    </div>
  );
}
