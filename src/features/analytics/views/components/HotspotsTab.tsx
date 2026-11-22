import { lazy, Suspense } from "react";
import { ScreenErrorBoundary } from "../../../../core/components/ScreenErrorBoundary";
import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import {
  formatMonthDay,
  formatNumber,
} from "../../../../core/utils/formatters";
import { usePrefersReducedMotion } from "../../../../core/hooks/usePrefersReducedMotion";
import { getInitials } from "../../../../core/utils/names";
import { densityLevels, type AnalyticsRange } from "../../models/analytics";
import {
  useHotspotsViewModel,
  type HotspotsViewModel,
} from "../../viewmodels/useHotspotsViewModel";
import { AnalyticsCard, CardContent, LegendDot } from "./AnalyticsCard";
import { densityFill } from "./analyticsColors";

// mapbox-gl is large, so it downloads only when the Hotspots tab is opened.
const HotspotsMap = lazy(() =>
  import("./HotspotsMap").then((module) => ({
    default: module.HotspotsMap,
  })),
);

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

function HotspotsCard({ viewModel }: CardProps) {
  const strings = AppStrings.analytics.hotspots;
  const categoryNames = AppStrings.analytics.categories.names;
  const { hotspots, mapToken } = viewModel;
  const reduceMotion = usePrefersReducedMotion();

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
        isEmpty={viewModel.isHotspotsEmpty}
      >
        <div className="relative h-80 overflow-hidden rounded-2xl bg-surface-tint">
          {mapToken === null ? (
            <MapNotice>{strings.mapUnavailable}</MapNotice>
          ) : (
            <>
              <ScreenErrorBoundary>
                <Suspense fallback={null}>
                  <HotspotsMap
                    token={mapToken}
                    hotspots={hotspots}
                    fitAllRequest={viewModel.fitAllRequest}
                    reduceMotion={reduceMotion}
                    label={strings.mapLabel}
                    onError={viewModel.reportMapFailed}
                  />
                </Suspense>
              </ScreenErrorBoundary>
              {/* Top-left: Mapbox's zoom buttons take the top-right corner
                  and its logo and credits the bottom ones. */}
              <button
                type="button"
                onClick={viewModel.showAllHotspots}
                disabled={hotspots.length === 0}
                title={strings.showAllHint}
                className="absolute top-3 left-3 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-semibold text-primary shadow-md ring-1 ring-navy/5 backdrop-blur-md transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {strings.showAll}
              </button>
            </>
          )}
          {viewModel.isCategoryEmpty && (
            <div className="pointer-events-none absolute inset-x-4 bottom-10 flex justify-center">
              <p className="rounded-xl bg-white/95 px-4 py-2.5 text-center text-sm font-semibold text-slate shadow-lg ring-1 ring-navy/5">
                {strings.categoryEmpty}
              </p>
            </div>
          )}
          {/* What the map shows, for screen readers. */}
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

/** A message in place of the map. */
function MapNotice({ children }: { children: string }) {
  return (
    <p className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate">
      {children}
    </p>
  );
}

function InvasiveAlertsCard({ viewModel }: CardProps) {
  const strings = AppStrings.analytics.invasive;
  const categoryNames = AppStrings.analytics.categories.names;
  const { alerts } = viewModel;

  return (
    <AnalyticsCard
      title={strings.heading}
      titleBadge={
        viewModel.alertsState.isLoading ? undefined : (
          <span className="rounded-full bg-cyan px-2.5 py-0.5 text-xs leading-4 font-bold text-ink">
            {formatNumber(viewModel.alertCount)} {strings.activeSuffix}
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
          {alerts.map((alert) => {
            const name = alert.commonName ?? categoryNames[alert.category];
            return (
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
                    {getInitials(name)}
                  </span>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="min-w-0 text-sm leading-5">
                    <span className="font-bold text-ink">{name}</span>
                    {alert.scientificName && (
                      <>
                        {" "}
                        <span className="text-slate italic">
                          ({alert.scientificName})
                        </span>
                      </>
                    )}
                  </p>
                  <p className="text-xs leading-4 font-semibold text-slate">
                    <time dateTime={alert.reportedAt}>
                      {formatMonthDay(alert.reportedAt)}
                    </time>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </AnalyticsCard>
  );
}
