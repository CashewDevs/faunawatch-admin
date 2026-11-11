import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { PostDetail } from "../../models/post";
import type { PostDetailViewModel } from "../../viewmodels/usePostDetailViewModel";
import { PostStatusPill } from "./PostStatusPill";

interface PostDecisionBarProps {
  post: PostDetail;
  viewModel: PostDetailViewModel;
}

const buttonClass =
  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm leading-5 font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed";

/**
 * Sticky bar at the bottom of the page: which post this is, and the
 * Decline / Request changes / Approve decision while it's pending. Once
 * decided it shows the outcome, plus Take down on an approved post.
 */
export function PostDecisionBar({ post, viewModel }: PostDecisionBarProps) {
  const strings = AppStrings.posts;
  const decision = strings.detail.decision;

  return (
    <div
      role="region"
      aria-label={decision.label}
      className="sticky bottom-4 z-10 mx-8 mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white/95 px-8 py-3.5 shadow-lg backdrop-blur-[6px]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="rounded-md bg-deep-blue px-2.5 py-1 text-xs leading-4 font-bold tracking-[0.24px] text-white">
          #{post.reference}
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-base leading-6">
            <span className="font-bold text-deep-blue">
              {post.aiMatch?.commonName ?? strings.category[post.category]}
            </span>
            <span className="text-xs text-slate">
              {" "}
              • {decision.byPrefix} {post.reporter.fullName}
            </span>
          </p>
          <p className="truncate text-[11px] leading-[14px] font-semibold tracking-[0.44px] text-teal">
            {decision.priorityPrefix} {strings.severity[post.severity]}
            {post.ai?.origin === "endemic" && ` • ${decision.endemicSafeguard}`}
          </p>
        </div>
      </div>

      {viewModel.canDecide ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={viewModel.decline}
            className={`${buttonClass} text-danger hover:bg-danger-tint`}
          >
            <img src={AppAssets.shared.iconDecline} alt="" />
            {decision.decline}
          </button>
          <button
            type="button"
            disabled={!viewModel.isRequestChangesAvailable}
            title={
              viewModel.isRequestChangesAvailable
                ? undefined
                : decision.requestChangesUnavailable
            }
            className={`${buttonClass} bg-surface-tint text-deep-blue hover:bg-chip disabled:hover:bg-surface-tint`}
          >
            {decision.requestChanges}
          </button>
          <button
            type="button"
            onClick={viewModel.approve}
            className={`${buttonClass} bg-amber px-5 text-white shadow-xs hover:bg-amber/90`}
          >
            <img src={AppAssets.shared.iconApprove} alt="" />
            {decision.approve}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <PostStatusPill status={post.status} />
          {viewModel.canTakeDown && (
            <button
              type="button"
              onClick={viewModel.takeDown}
              className={`${buttonClass} text-danger hover:bg-danger-tint`}
            >
              {decision.takeDown}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
