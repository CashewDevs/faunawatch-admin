import { Pie, PieChart } from "recharts";
import { AppStrings } from "../../../../core/constants/appStrings";
import { usePrefersReducedMotion } from "../../../../core/hooks/usePrefersReducedMotion";
import { formatNumber } from "../../../../core/utils/formatters";
import type { AnalyticsRange } from "../../models/analytics";
import type { OverviewViewModel } from "../../viewmodels/useOverviewViewModel";
import {
  AnalyticsCard,
  CardContent,
  LegendDot,
  RangeBadge,
} from "./AnalyticsCard";
import { reviewOutcomeColor, reviewOutcomeFill } from "./analyticsColors";

interface ReviewOutcomesCardProps {
  viewModel: OverviewViewModel;
  range: AnalyticsRange;
}

const donutSize = 220;

/**
 * Donut of approved, declined, and awaiting-triage posts, with the total
 * and approval rate in the middle and the counts listed underneath.
 */
export function ReviewOutcomesCard({
  viewModel,
  range,
}: ReviewOutcomesCardProps) {
  const strings = AppStrings.analytics.reviewOutcomes;
  const { outcomes } = viewModel;
  const isAnimated = !usePrefersReducedMotion();

  return (
    <AnalyticsCard
      title={strings.heading}
      description={strings.description}
      trailing={
        <RangeBadge>{AppStrings.analytics.rangeBadges[range]}</RangeBadge>
      }
      className="overflow-hidden pb-0"
    >
      <CardContent
        state={viewModel.outcomesState}
        isEmpty={!outcomes || outcomes.total === 0}
      >
        {outcomes && (
          <>
            <div className="relative mx-auto my-4 size-55">
              <PieChart
                width={donutSize}
                height={donutSize}
                accessibilityLayer={false}
                aria-hidden="true"
              >
                <Pie
                  data={outcomes.shares.map((share) => ({
                    ...share,
                    fill: reviewOutcomeColor[share.key],
                  }))}
                  dataKey="count"
                  nameKey="key"
                  innerRadius={84}
                  outerRadius={106}
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={1.5}
                  cornerRadius={4}
                  stroke="none"
                  isAnimationActive={isAnimated}
                />
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[32px] leading-10 font-bold tracking-[-0.8px] text-ink">
                  {formatNumber(outcomes.total)}
                </span>
                <span className="text-xs leading-4 font-bold tracking-[0.6px] text-slate uppercase">
                  {strings.totalLabel}
                </span>
                <span className="mt-1 text-xs leading-4 font-bold tracking-[0.24px] text-amber-ink">
                  {outcomes.approvalPercent.toFixed(1)}%{" "}
                  {strings.approvedSuffix}
                </span>
              </div>
            </div>
            <ul className="-mx-6 mt-auto flex flex-col gap-3 bg-surface px-6 py-5">
              {outcomes.shares.map((share) => (
                <li
                  key={share.key}
                  className="flex items-center gap-2.5 text-sm leading-5"
                >
                  <LegendDot
                    fillClass={reviewOutcomeFill[share.key]}
                    sizeClass="size-3"
                  />
                  <span className="font-semibold text-ink">
                    {strings.outcomes[share.key]}
                  </span>
                  <span className="ml-auto font-bold text-ink">
                    {formatNumber(share.count)}
                  </span>
                  <span className="w-14 text-right text-slate">
                    ({share.percent.toFixed(1)}%)
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </AnalyticsCard>
  );
}
