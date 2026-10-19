import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import {
  formatMonthDay,
  formatNumber,
} from "../../../../core/utils/formatters";
import { getInitials } from "../../../../core/utils/names";
import {
  densityLevels,
  type AnalyticsRange,
  type DensityLevel,
  type InvasiveThreat,
} from "../../models/analytics";
import {
  useHotspotsViewModel,
  type HotspotsViewModel,
} from "../../viewmodels/useHotspotsViewModel";
import { AnalyticsCard, CardContent, LegendDot } from "./AnalyticsCard";
import { densityFill, densityHaloFill } from "./analyticsColors";

/**
 * Hotspots & Invasives tab: sighting hotspots and invasive-species alerts.
 */
export function HotspotsTab({ range }: { range: AnalyticsRange }) {
  const viewModel = useHotspotsViewModel(range);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <HotspotsCard viewModel={viewModel} />
      <InvasiveAlertsCard viewModel={viewModel} />
    </div>
  );
}

interface CardProps {
  viewModel: HotspotsViewModel;
}

/** Halo radius in px; busier tiers draw bigger. */
const haloRadius: Record<DensityLevel, number> = {
  low: 16,
  moderate: 22,
  high: 28,
  critical: 34,
};

function HotspotsCard({ viewModel }: CardProps) {
  const strings = AppStrings.analytics.hotspots;
  const categoryNames = AppStrings.analytics.categories.names;
  const { hotspots } = viewModel;

  return (
    <AnalyticsCard
      title={strings.heading}
      description={strings.description}
      trailing={
        <div className="relative">
          <select
            aria-label={strings.categoryLabel}
            value={viewModel.category}
            onChange={(event) => {
              const value = viewModel.categoryOptions.find(
                (option) => option === event.target.value,
              );
              viewModel.changeCategory(value ?? "all");
            }}
            className="cursor-pointer appearance-none rounded-xl bg-surface-tint py-2.5 pr-10 pl-4 text-sm leading-5 font-semibold text-ink focus:outline-2 focus:outline-primary"
          >
            <option value="all">{strings.allCategories}</option>
            {viewModel.categoryOptions.map((option) => (
              <option key={option} value={option}>
                {categoryNames[option]}
              </option>
            ))}
          </select>
          <img
            src={AppAssets.postApprovals.iconChevronDown}
            alt=""
            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
          />
        </div>
      }
    >
      <CardContent
        state={viewModel.hotspotsState}
        isEmpty={hotspots.length === 0}
      >
        <div className="relative h-80 overflow-hidden rounded-2xl bg-surface-tint">
          {/* Schematic panel: markers are placed in SVG by percentage so
              no inline styles are needed. Labels use foreignObject for the
              HTML pill. */}
          <svg
            role="img"
            aria-label={strings.panelLabel}
            className="absolute inset-0 size-full overflow-visible"
          >
            {hotspots.map((hotspot) => {
              const cx = `${String(hotspot.leftPercent)}%`;
              const cy = `${String(hotspot.topPercent)}%`;
              return (
                <g key={hotspot.id}>
                  <title>
                    {`${hotspot.name}: ${formatNumber(hotspot.sightingCount)} ${strings.sightingsSuffix}`}
                  </title>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={haloRadius[hotspot.density]}
                    className={densityHaloFill[hotspot.density]}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={7}
                    className={`${densityFill[hotspot.density]} stroke-white stroke-2`}
                  />
                </g>
              );
            })}
            {hotspots
              .filter((hotspot) => hotspot.isLabelled)
              .map((hotspot) => (
                <foreignObject
                  key={hotspot.id}
                  x={`${String(hotspot.leftPercent)}%`}
                  y={`${String(hotspot.topPercent)}%`}
                  width="1"
                  height="1"
                  className="overflow-visible"
                >
                  <span
                    className={`flex w-max -translate-x-1/2 items-center ${
                      // Below the marker in the top half, above it lower down,
                      // so the label stays inside the panel.
                      hotspot.topPercent > 55
                        ? "-translate-y-[calc(100%+2.75rem)]"
                        : "translate-y-10"
                    } gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm leading-5 font-semibold text-ink shadow-sm`}
                  >
                    <LegendDot fillClass={densityFill[hotspot.density]} />
                    {hotspot.name} ({formatNumber(hotspot.sightingCount)})
                  </span>
                </foreignObject>
              ))}
          </svg>
          <ul className="sr-only">
            {hotspots.map((hotspot) => (
              <li key={hotspot.id}>
                {hotspot.name}: {formatNumber(hotspot.sightingCount)}{" "}
                {strings.sightingsSuffix}, {strings.density[hotspot.density]}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-xs leading-4 font-semibold text-slate">
            {strings.densityLabel}
          </span>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {densityLevels.map((level) => (
              <li
                key={level}
                className="flex items-center gap-1.5 text-sm leading-5 font-semibold text-ink"
              >
                <LegendDot fillClass={densityFill[level]} sizeClass="size-3" />
                {strings.density[level]}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </AnalyticsCard>
  );
}

const threatPillClass: Record<InvasiveThreat, string> = {
  colony: "bg-cyan/40 text-ink",
  aquatic: "bg-cyan/40 text-ink",
  ecosystem: "bg-cyan/40 text-ink",
  biosecurity: "bg-danger-soft text-danger",
};

function InvasiveAlertsCard({ viewModel }: CardProps) {
  const strings = AppStrings.analytics.invasive;
  const { alerts } = viewModel;

  return (
    <AnalyticsCard
      title={strings.heading}
      titleBadge={
        viewModel.alertsState.isLoading ? undefined : (
          <span className="rounded-full bg-cyan px-2.5 py-0.5 text-xs leading-4 font-bold text-ink">
            {formatNumber(alerts.length)} {strings.activeSuffix}
          </span>
        )
      }
      description={strings.description}
      trailing={
        <button
          type="button"
          disabled={!viewModel.isViewAllAlertsAvailable}
          title={
            viewModel.isViewAllAlertsAvailable
              ? undefined
              : strings.viewAllUnavailable
          }
          className="pt-1 text-sm leading-5 font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:no-underline"
        >
          {strings.viewAll}
        </button>
      }
    >
      <CardContent state={viewModel.alertsState} isEmpty={alerts.length === 0}>
        <ul aria-label={strings.listLabel} className="flex flex-col gap-3">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="flex items-center gap-3 rounded-xl bg-surface-tint p-3"
            >
              {alert.photoUrl ? (
                <img
                  src={alert.photoUrl}
                  alt=""
                  className="size-14 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-chip text-sm font-bold text-primary"
                >
                  {getInitials(alert.commonName)}
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                  <p className="min-w-0 text-sm leading-5">
                    <span className="font-bold text-ink">
                      {alert.commonName}
                    </span>{" "}
                    <span className="text-slate italic">
                      ({alert.scientificName})
                    </span>
                  </p>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-xs leading-4 font-semibold ${threatPillClass[alert.threat]}`}
                  >
                    {strings.threats[alert.threat]}
                  </span>
                </div>
                <p className="flex flex-wrap items-center gap-x-1.5 text-xs leading-4 font-semibold text-slate">
                  <img src={AppAssets.postApprovals.iconLocationPin} alt="" />
                  {alert.locationName}
                  <span aria-hidden="true">•</span>
                  <time dateTime={alert.reportedOn}>
                    {formatMonthDay(alert.reportedOn)}
                  </time>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </AnalyticsCard>
  );
}
