import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppStrings } from "../../../../core/constants/appStrings";
import { usePrefersReducedMotion } from "../../../../core/hooks/usePrefersReducedMotion";
import {
  formatMonth,
  formatMonthDay,
  formatMonthYear,
  formatNumber,
} from "../../../../core/utils/formatters";
import {
  trendGranularities,
  trendSeries,
  type TrendGranularity,
} from "../../models/analytics";
import type { OverviewViewModel } from "../../viewmodels/useOverviewViewModel";
import { AnalyticsCard, CardContent, LegendDot } from "./AnalyticsCard";
import { trendSeriesColor, trendSeriesFill } from "./analyticsColors";
import { SegmentedControl } from "./SegmentedControl";

interface PostsOverTimeCardProps {
  viewModel: OverviewViewModel;
}

const axisTick = { fill: "var(--color-muted)", fontSize: 12 };

function formatTick(isoDate: string, granularity: TrendGranularity): string {
  return granularity === "monthly"
    ? formatMonth(isoDate)
    : formatMonthDay(isoDate);
}

function formatPeriod(isoDate: string, granularity: TrendGranularity): string {
  const strings = AppStrings.analytics.postsOverTime;
  switch (granularity) {
    case "daily":
      return formatMonthDay(isoDate);
    case "weekly":
      return `${strings.weekOf} ${formatMonthDay(isoDate)}`;
    case "monthly":
      return formatMonthYear(isoDate);
  }
}

/**
 * Area chart of submitted, approved, and declined posts per day, week, or
 * month, with a hover tooltip and a screen-reader table.
 */
export function PostsOverTimeCard({ viewModel }: PostsOverTimeCardProps) {
  const strings = AppStrings.analytics.postsOverTime;
  const gradientId = useId();
  const isAnimated = !usePrefersReducedMotion();
  const { trend, granularity } = viewModel;

  return (
    <AnalyticsCard
      title={strings.heading}
      description={strings.description}
      trailing={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <SegmentedControl
            label={strings.granularityLabel}
            options={trendGranularities.map((option) => ({
              value: option,
              label: strings.granularities[option],
              isDisabled: !viewModel.availableGranularities.includes(option),
            }))}
            value={granularity}
            onChange={viewModel.changeGranularity}
          />
          <ul className="flex items-center gap-4">
            {trendSeries.map((series) => (
              <li
                key={series}
                className="flex items-center gap-1.5 text-sm leading-5 font-semibold text-ink"
              >
                <LegendDot fillClass={trendSeriesFill[series]} />
                {strings.series[series]}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <CardContent state={viewModel.trendState} isEmpty={trend.length === 0}>
        <div className="h-80" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trend}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              accessibilityLayer={false}
            >
              <defs>
                {(["submitted", "approved"] as const).map((series) => (
                  <linearGradient
                    key={series}
                    id={`${gradientId}-${series}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={trendSeriesColor[series]}
                      stopOpacity={0.22}
                    />
                    <stop
                      offset="100%"
                      stopColor={trendSeriesColor[series]}
                      stopOpacity={0}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-divider)" />
              <XAxis
                dataKey="periodStart"
                tickFormatter={(value: string) =>
                  formatTick(value, granularity)
                }
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={28}
              />
              <YAxis
                tickFormatter={(value: number) => formatNumber(value)}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                cursor={{ stroke: "var(--color-border)" }}
                content={({ active, payload, label }) => (
                  <TrendTooltip
                    active={active}
                    payload={payload}
                    label={label}
                    granularity={granularity}
                  />
                )}
              />
              <Area
                type="monotone"
                isAnimationActive={isAnimated}
                dataKey="submitted"
                stroke={trendSeriesColor.submitted}
                strokeWidth={2}
                fill={`url(#${gradientId}-submitted)`}
                activeDot={{ r: 5, stroke: "white", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                isAnimationActive={isAnimated}
                dataKey="approved"
                stroke={trendSeriesColor.approved}
                strokeWidth={2}
                fill={`url(#${gradientId}-approved)`}
                activeDot={{ r: 5, stroke: "white", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                isAnimationActive={isAnimated}
                dataKey="declined"
                stroke={trendSeriesColor.declined}
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="none"
                activeDot={{ r: 5, stroke: "white", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <table className="sr-only">
          <caption>{strings.chartLabel}</caption>
          <thead>
            <tr>
              <th scope="col">{strings.granularities[granularity]}</th>
              {trendSeries.map((series) => (
                <th key={series} scope="col">
                  {strings.series[series]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trend.map((point) => (
              <tr key={point.periodStart}>
                <th scope="row">
                  {formatPeriod(point.periodStart, granularity)}
                </th>
                {trendSeries.map((series) => (
                  <td key={series}>{formatNumber(point[series])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </AnalyticsCard>
  );
}

interface TrendTooltipProps {
  active: boolean | undefined;
  payload: readonly { dataKey?: unknown; value?: unknown }[];
  label: unknown;
  granularity: TrendGranularity;
}

function TrendTooltip({
  active,
  payload,
  label,
  granularity,
}: TrendTooltipProps) {
  const strings = AppStrings.analytics.postsOverTime;
  if (!active || payload.length === 0 || typeof label !== "string") {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-sm leading-5 shadow-lg ring-1 ring-divider">
      <span className="font-semibold text-ink">
        {formatPeriod(label, granularity)}
      </span>
      {trendSeries.map((series) => {
        const entry = payload.find((item) => item.dataKey === series);
        if (entry?.value === undefined) return null;
        return (
          <span key={series} className="flex items-center gap-2 text-slate">
            <LegendDot fillClass={trendSeriesFill[series]} />
            {strings.series[series]}
            <span className="ml-auto pl-4 font-semibold text-ink">
              {formatNumber(Number(entry.value))}
            </span>
          </span>
        );
      })}
    </div>
  );
}
