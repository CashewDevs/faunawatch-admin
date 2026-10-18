import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import {
  formatMonthYear,
  formatNumber,
} from "../../../../core/utils/formatters";
import type { PostDetail } from "../../models/post";
import { ReporterAvatar } from "./ReporterAvatar";

interface ReporterCardProps {
  post: PostDetail;
  approvalRate: number;
}

const statLabelClass =
  "text-center text-[11px] leading-[14px] font-bold tracking-[0.44px] text-slate";
const statValueClass =
  "pt-0.5 text-center text-lg leading-6 font-bold tracking-[-0.09px]";

/**
 * Who submitted the post and their track record.
 */
export function ReporterCard({ post, approvalRate }: ReporterCardProps) {
  const strings = AppStrings.posts.detail.reporter;
  const { reporter, reporterStats } = post;

  return (
    <section
      aria-label={strings.label}
      className="flex flex-col gap-4 rounded-xl bg-white p-6 drop-shadow-xs"
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <ReporterAvatar reporter={reporter} size="lg" />
          {reporterStats.isVerified && (
            <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-deep-blue">
              <img
                src={AppAssets.postDetail.iconVerified}
                alt={strings.verified}
                title={strings.verified}
              />
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-base leading-6 font-bold text-deep-blue">
              {reporter.fullName}
            </span>
            <span className="rounded-full bg-cyan px-2 py-0.5 text-[11px] leading-[14px] font-semibold tracking-[0.44px] text-teal">
              {reporter.role}
            </span>
          </div>
          <p className="flex flex-wrap items-center gap-2 text-[13px] leading-[18px] text-slate">
            <span>@{reporter.username}</span>
            <span aria-hidden="true">•</span>
            <span>
              {strings.memberSince} {formatMonthYear(reporterStats.memberSince)}
            </span>
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-3 rounded-xl bg-surface-tint p-3">
        <div className="flex flex-col-reverse">
          <dd className={`${statValueClass} text-deep-blue`}>
            {formatNumber(reporterStats.totalPosts)}
          </dd>
          <dt className={statLabelClass}>{strings.totalPosts}</dt>
        </div>
        <div className="flex flex-col-reverse border-x border-border/30">
          <dd className={`${statValueClass} text-amber-ink`}>
            {formatNumber(reporterStats.approvedPosts)}
          </dd>
          <dt className={statLabelClass}>{strings.approved}</dt>
        </div>
        <div className="flex flex-col-reverse">
          <dd className={`${statValueClass} text-danger`}>
            {formatNumber(reporterStats.declinedPosts)}
          </dd>
          <dt className={statLabelClass}>{strings.declined}</dt>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="flex items-center gap-1.5 text-[13px] leading-[18px] text-slate">
          <img src={AppAssets.postDetail.iconApprovalRate} alt="" />
          {approvalRate}% {strings.approvalRate}
        </p>
        {/* TODO(profile): No reporter profile screen exists yet. */}
        <button
          type="button"
          disabled
          title={strings.profileUnavailable}
          className="flex cursor-not-allowed items-center gap-1 text-xs leading-4 font-semibold tracking-[0.24px] text-deep-blue"
        >
          {strings.viewProfile}
          <img src={AppAssets.postDetail.iconArrowRight} alt="" />
        </button>
      </div>
    </section>
  );
}
