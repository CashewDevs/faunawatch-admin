import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import { formatNumber } from "../../../../core/utils/formatters";
import { formatReviewTime, type AnalyticsRange } from "../../models/analytics";
import {
  useSpeciesViewModel,
  type SpeciesViewModel,
} from "../../viewmodels/useSpeciesViewModel";
import { AnalyticsCard, CardContent, LegendDot } from "./AnalyticsCard";
import { categoryFill, severityFill } from "./analyticsColors";
import { MeterBar, StackedBar } from "./StackedBar";

/**
 * Species & Severity tab: top species, posts by category, and severity.
 */
export function SpeciesTab({ range }: { range: AnalyticsRange }) {
  const viewModel = useSpeciesViewModel(range);

  return (
    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      <TopSpeciesCard viewModel={viewModel} />
      <CategoryCard viewModel={viewModel} />
      <SeverityCard viewModel={viewModel} />
    </div>
  );
}

interface CardProps {
  viewModel: SpeciesViewModel;
}

function TopSpeciesCard({ viewModel }: CardProps) {
  const strings = AppStrings.analytics.topSpecies;
  const { topSpecies } = viewModel;

  return (
    <AnalyticsCard
      title={strings.heading}
      description={strings.description}
      trailing={
        topSpecies.length > 0 && (
          <span className="pt-1 text-xs leading-4 font-semibold text-slate">
            {strings.topPrefix} {topSpecies.length}
          </span>
        )
      }
    >
      <CardContent state={viewModel.state} isEmpty={topSpecies.length === 0}>
        <ol className="flex flex-col gap-4">
          {topSpecies.map((species) => (
            <li key={species.commonName} className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between gap-3 text-sm leading-5">
                <span className="text-ink">{species.commonName}</span>
                <span className="font-semibold text-deep-blue">
                  {formatNumber(species.count)}
                </span>
              </span>
              <MeterBar
                percent={species.barPercent}
                fillClass="fill-deep-blue"
              />
            </li>
          ))}
        </ol>
      </CardContent>
    </AnalyticsCard>
  );
}

function CategoryCard({ viewModel }: CardProps) {
  const strings = AppStrings.analytics.categories;
  const { categoryShares } = viewModel;

  return (
    <AnalyticsCard
      title={strings.heading}
      description={strings.description}
      trailing={<img src={AppAssets.analytics.iconCategory} alt="" />}
    >
      <CardContent
        state={viewModel.state}
        isEmpty={categoryShares.every((share) => share.count === 0)}
      >
        <StackedBar
          label={strings.barLabel}
          segments={categoryShares.map((share) => ({
            key: share.key,
            label: strings.names[share.key],
            value: share.count,
            percent: share.percent,
            fillClass: categoryFill[share.key],
          }))}
        />
        <ul className="grid grid-cols-2 gap-3">
          {categoryShares.map((share) => (
            <li
              key={share.key}
              className="flex flex-col gap-1 rounded-xl bg-surface-tint px-3.5 py-3"
            >
              <span className="flex items-center gap-1.5 text-xs leading-4 font-bold text-slate">
                <LegendDot fillClass={categoryFill[share.key]} />
                {strings.names[share.key]}
              </span>
              <span className="text-xs leading-4 text-slate">
                <span className="text-xl leading-7 font-bold text-ink">
                  {share.percent}%
                </span>{" "}
                ({formatNumber(share.count)})
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </AnalyticsCard>
  );
}

const reviewTimeText = {
  low: "text-amber-ink",
  medium: "text-deep-blue",
  high: "text-danger",
} as const;

function SeverityCard({ viewModel }: CardProps) {
  const strings = AppStrings.analytics.severity;
  const { severityShares } = viewModel;

  return (
    <AnalyticsCard
      title={strings.heading}
      description={strings.description}
      trailing={<img src={AppAssets.analytics.iconWarning} alt="" />}
    >
      <CardContent
        state={viewModel.state}
        isEmpty={severityShares.every((share) => share.count === 0)}
      >
        <StackedBar
          label={strings.barLabel}
          segments={severityShares.map((share) => ({
            key: share.key,
            label: strings.tiers[share.key].name,
            value: share.count,
            percent: share.percent,
            fillClass: severityFill[share.key],
          }))}
        />
        <ul className="flex flex-col gap-3">
          {severityShares.map((share) => {
            const tier = strings.tiers[share.key];
            const isHigh = share.key === "high";
            return (
              <li
                key={share.key}
                className="flex items-start gap-3 rounded-xl bg-surface-tint p-4"
              >
                <LegendDot
                  fillClass={severityFill[share.key]}
                  sizeClass="mt-1.5 size-2.5"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm leading-5 font-bold text-ink">
                    {tier.name}
                  </span>
                  <span className="text-sm leading-5 text-slate">
                    {tier.description}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end text-right">
                  <span
                    className={`text-sm leading-5 font-bold ${isHigh ? "text-danger" : "text-ink"}`}
                  >
                    {formatNumber(share.count)}
                  </span>
                  <span
                    className={`text-sm leading-5 font-semibold ${isHigh ? "text-danger" : "text-ink"}`}
                  >
                    ({share.percent}%)
                  </span>
                  {share.medianReviewMinutes !== null && (
                    <span
                      className={`mt-1 text-xs leading-4 font-bold ${reviewTimeText[share.key]}`}
                    >
                      {formatReviewTime(share.medianReviewMinutes)}{" "}
                      {strings.reviewSuffix}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </AnalyticsCard>
  );
}
