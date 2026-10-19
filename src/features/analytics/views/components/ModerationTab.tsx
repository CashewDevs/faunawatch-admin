import type { ReactNode } from "react";
import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import { formatNumber } from "../../../../core/utils/formatters";
import {
  getAvatarTone,
  getInitials,
  type AvatarTone,
} from "../../../../core/utils/names";
import type { AnalyticsRange } from "../../models/analytics";
import {
  useModerationViewModel,
  type ModerationViewModel,
} from "../../viewmodels/useModerationViewModel";
import {
  AnalyticsCard,
  CardContent,
  LegendDot,
  RangeBadge,
} from "./AnalyticsCard";
import {
  declineReasonFill,
  otherReviewersFill,
  reviewerFill,
} from "./analyticsColors";
import { MeterBar, StackedBar } from "./StackedBar";

/**
 * Contributors & Moderation tab: contributor leaderboard and moderation
 * activity.
 */
export function ModerationTab({ range }: { range: AnalyticsRange }) {
  const viewModel = useModerationViewModel(range);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]">
      <TopContributorsCard viewModel={viewModel} range={range} />
      <ModerationActivityCard viewModel={viewModel} />
    </div>
  );
}

const headerCellClass =
  "bg-surface-tint py-3.5 text-xs leading-4 font-bold tracking-[0.6px] text-slate uppercase";

const avatarToneClass: Record<AvatarTone, string> = {
  primary: "bg-deep-blue",
  amber: "bg-amber-ink",
  teal: "bg-primary",
};

function TopContributorsCard({
  viewModel,
  range,
}: {
  viewModel: ModerationViewModel;
  range: AnalyticsRange;
}) {
  const strings = AppStrings.analytics.contributors;
  const { contributors } = viewModel;

  return (
    <AnalyticsCard
      title={strings.heading}
      description={strings.description}
      trailing={
        <RangeBadge>{AppStrings.analytics.rangeBadges[range]}</RangeBadge>
      }
    >
      <CardContent
        state={viewModel.contributorsState}
        isEmpty={contributors.length === 0}
      >
        <div className="overflow-x-auto">
          {/* Grid table like UserTable; the ranger column absorbs spare width
              and truncates long names so the rate never gets cut off. */}
          <table
            role="table"
            aria-label={strings.caption}
            className="grid w-full min-w-110 grid-cols-[minmax(0,1fr)_auto_max-content]"
          >
            <thead role="rowgroup" className="contents">
              <tr role="row" className="contents">
                <th
                  role="columnheader"
                  scope="col"
                  className={`rounded-l-lg pr-4 pl-4 text-left ${headerCellClass}`}
                >
                  {strings.rankAndRanger}
                </th>
                <th
                  role="columnheader"
                  scope="col"
                  className={`px-4 text-left ${headerCellClass}`}
                >
                  {strings.submissions}
                </th>
                <th
                  role="columnheader"
                  scope="col"
                  className={`rounded-r-lg pr-4 pl-4 text-left ${headerCellClass}`}
                >
                  {strings.approvalRate}
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup" className="contents">
              {contributors.map((contributor) => (
                <tr
                  key={contributor.id}
                  role="row"
                  className="contents *:border-b *:border-divider *:py-3.5 last:*:border-b-0"
                >
                  <td role="cell" className="flex items-center gap-3 pr-4 pl-4">
                    <span
                      aria-label={`${strings.rankPrefix} ${String(contributor.rank)}`}
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs leading-4 font-bold ${
                        contributor.rank === 1
                          ? "bg-cyan text-ink"
                          : "bg-chip text-slate"
                      }`}
                    >
                      {contributor.rank}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                        avatarToneClass[getAvatarTone(contributor.fullName)]
                      }`}
                    >
                      {getInitials(contributor.fullName)}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm leading-5 font-bold text-ink">
                        {contributor.fullName}
                      </span>
                      <span className="truncate text-xs leading-4 font-semibold text-slate">
                        @{contributor.username}
                      </span>
                    </span>
                  </td>
                  <td
                    role="cell"
                    className="flex items-center px-4 text-sm leading-5 font-bold whitespace-nowrap text-ink"
                  >
                    {formatNumber(contributor.submissions)}{" "}
                    {contributor.submissions === 1
                      ? strings.postSuffix
                      : strings.postsSuffix}
                  </td>
                  <td role="cell" className="flex items-center gap-2.5 px-4">
                    <MeterBar
                      percent={contributor.approvalRate}
                      fillClass="fill-amber-ink"
                      className="w-20"
                    />
                    <span className="w-10 text-right text-sm leading-5 font-bold text-ink">
                      {contributor.approvalRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </AnalyticsCard>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs leading-4 font-bold tracking-[0.6px] text-slate uppercase">
      {children}
    </h3>
  );
}

function ModerationActivityCard({
  viewModel,
}: {
  viewModel: ModerationViewModel;
}) {
  const strings = AppStrings.analytics.moderation;
  const { reviewerShares, declineReasonShares } = viewModel;
  const reviewers = reviewerShares.map((share, index) => ({
    ...share,
    key: share.reviewerName ?? "others",
    label: share.reviewerName ?? strings.otherReviewers,
    fillClass:
      share.reviewerName === null
        ? otherReviewersFill
        : (reviewerFill[index] ?? otherReviewersFill),
  }));

  return (
    <AnalyticsCard
      title={strings.heading}
      description={strings.description}
      trailing={<img src={AppAssets.analytics.iconClipboardCheck} alt="" />}
    >
      <CardContent
        state={viewModel.activityState}
        isEmpty={reviewers.length === 0 && declineReasonShares.length === 0}
      >
        <div className="flex flex-col gap-3 rounded-xl bg-surface-tint p-4">
          <SectionLabel>{strings.reviewerAllocation}</SectionLabel>
          <StackedBar
            label={strings.reviewerBarLabel}
            heightClass="h-3 rounded-full"
            segments={reviewers.map((reviewer) => ({
              key: reviewer.key,
              label: reviewer.label,
              value: reviewer.decisions,
              percent: reviewer.percent,
              fillClass: reviewer.fillClass,
            }))}
          />
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {reviewers.map((reviewer) => (
              <li
                key={reviewer.key}
                className="flex items-center gap-1.5 text-xs leading-4 font-bold text-slate"
              >
                <LegendDot fillClass={reviewer.fillClass} />
                {reviewer.label} ({reviewer.percent}%)
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <SectionLabel>{strings.declineReasons}</SectionLabel>
          <ul className="flex flex-col gap-3">
            {declineReasonShares.map((share) => (
              <li
                key={share.key}
                className="grid grid-cols-[minmax(0,1fr)_minmax(64px,128px)_3rem] items-center gap-4 text-sm leading-5"
              >
                <span className="flex min-w-0 items-center gap-2 text-ink">
                  <LegendDot
                    fillClass={declineReasonFill[share.key]}
                    sizeClass="size-1.5"
                  />
                  <span className="truncate">{strings.reasons[share.key]}</span>
                </span>
                <MeterBar
                  percent={share.percent}
                  fillClass={declineReasonFill[share.key]}
                />
                <span className="text-right font-bold text-ink">
                  {share.percent}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </AnalyticsCard>
  );
}
