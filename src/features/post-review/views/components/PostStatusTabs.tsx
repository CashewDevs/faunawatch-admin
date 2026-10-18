import { AppStrings } from "../../../../core/constants/appStrings";
import { formatNumber } from "../../../../core/utils/formatters";
import { postTabs } from "../../models/post";
import type { PostApprovalsViewModel } from "../../viewmodels/usePostApprovalsViewModel";

interface PostStatusTabsProps {
  viewModel: PostApprovalsViewModel;
}

/**
 * Pending / Approved / Declined / All Posts switch, each with its count.
 */
export function PostStatusTabs({ viewModel }: PostStatusTabsProps) {
  const strings = AppStrings.posts;

  return (
    <div
      role="group"
      aria-label={strings.tabsLabel}
      className="flex flex-wrap items-center gap-2"
    >
      {postTabs.map((tab) => {
        const isSelected = viewModel.tab === tab;
        const count = viewModel.counts?.[tab];
        return (
          <button
            key={tab}
            type="button"
            aria-pressed={isSelected}
            onClick={() => {
              viewModel.changeTab(tab);
            }}
            className={`flex items-center gap-2.5 rounded-lg px-4 py-2 text-base leading-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              isSelected
                ? "bg-primary text-white drop-shadow-xs"
                : "text-slate hover:bg-surface-tint"
            }`}
          >
            {strings.tabs[tab]}{" "}
            {count !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] leading-[14px] font-bold tracking-[0.44px] ${
                  isSelected ? "bg-cyan text-ink" : "bg-chip text-slate"
                }`}
              >
                {formatNumber(count)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
