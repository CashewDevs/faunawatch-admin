import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import { formatNumber } from "../../../../core/utils/formatters";
import type { PostApprovalsViewModel } from "../../viewmodels/usePostApprovalsViewModel";

interface BulkActionBarProps {
  viewModel: PostApprovalsViewModel;
}

const pillButtonClass =
  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-base leading-6 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-yellow disabled:cursor-not-allowed";

/**
 * Floating bar shown while posts are selected: count, select all /
 * unselect all, then bulk approve and decline.
 */
export function BulkActionBar({ viewModel }: BulkActionBarProps) {
  const strings = AppStrings.posts;
  const bulk = strings.bulk;
  const { selectedCount, isModerationAvailable } = viewModel;

  if (selectedCount === 0) return null;

  const count = formatNumber(selectedCount);
  const selectedNoun =
    selectedCount === 1 ? bulk.selectedPostSuffix : bulk.selectedPostsSuffix;
  const disabledTitle = isModerationAvailable
    ? undefined
    : strings.moderationUnavailable;

  return (
    <div
      role="region"
      aria-label={bulk.label}
      // Centred on the content area: half the viewport plus half the 16rem sidebar.
      className="fixed bottom-18 left-[calc(50%+8rem)] z-30 flex -translate-x-1/2 animate-fade-in-up items-center gap-5 rounded-full bg-deep-blue py-3 pr-3 pl-6 shadow-2xl motion-reduce:animate-none"
    >
      <span
        aria-live="polite"
        className="text-base leading-6 whitespace-nowrap text-white"
      >
        {count} {selectedCount === 1 ? bulk.selectedOne : bulk.selectedMany}
      </span>

      <button
        type="button"
        onClick={viewModel.toggleSelectAll}
        className="text-[13px] leading-[18px] whitespace-nowrap text-white/60 underline transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-accent-yellow"
      >
        {viewModel.allOnPageSelected ? bulk.unselectAll : bulk.selectAll}
      </button>

      <span aria-hidden="true" className="h-4 w-px bg-white/20" />

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          disabled={!isModerationAvailable}
          title={disabledTitle}
          aria-label={`${bulk.approve} ${count} ${selectedNoun}`}
          onClick={viewModel.approveSelected}
          className={`${pillButtonClass} bg-teal text-white drop-shadow-xs hover:bg-teal/90 disabled:hover:bg-teal`}
        >
          <img src={AppAssets.postApprovals.iconBulkApprove} alt="" />
          {bulk.approve}
        </button>
        <button
          type="button"
          disabled={!isModerationAvailable}
          title={disabledTitle}
          aria-label={`${bulk.decline} ${count} ${selectedNoun}`}
          onClick={viewModel.declineSelected}
          className={`${pillButtonClass} bg-white/10 text-danger-soft hover:bg-white/20 disabled:hover:bg-white/10`}
        >
          <img src={AppAssets.postApprovals.iconBulkDecline} alt="" />
          {bulk.decline}
        </button>
      </div>
    </div>
  );
}
