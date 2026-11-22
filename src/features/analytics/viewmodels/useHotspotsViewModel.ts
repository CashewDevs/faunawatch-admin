import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getMapboxToken } from "../../../core/services/mapboxConfig";
import { reportCategories } from "../../post-review/models/post";
import { signedUrlStaleTimeMs } from "../../post-review/viewmodels/postQueries";
import {
  getInvasiveAlerts,
  toMappedHotspots,
  toSightingHotspots,
  type AnalyticsRange,
  type HotspotCategoryFilter,
} from "../models/analytics";
import {
  fetchSectorCells,
  signAlertPhotos,
} from "../services/analyticsService";
import { analyticsDataQuery } from "./analyticsQueries";
import { toCardQueryState } from "./cardQueryState";

/**
 * Hotspots & Invasives tab: reports per map grid cell (filterable by
 * category) on a live map, and the newest reports the AI flagged as
 * possibly invasive.
 */
export function useHotspotsViewModel(
  range: AnalyticsRange,
  token: string | null = getMapboxToken(),
) {
  const [category, setCategory] = useState<HotspotCategoryFilter>("all");
  const [hasMapFailed, setHasMapFailed] = useState(false);
  // Bumped by "Show all"; the map zooms to fit every hotspot when it changes.
  const [fitAllRequest, setFitAllRequest] = useState(0);

  // One call per range; the category filter is applied to its breakdown.
  const cellsQuery = useQuery({
    queryKey: ["analytics", "sectors", range],
    queryFn: () => fetchSectorCells(range),
    placeholderData: keepPreviousData,
  });

  const dataQuery = useQuery(analyticsDataQuery(range));
  const data = dataQuery.data;
  const invasive = useMemo(
    () => (data ? getInvasiveAlerts(data.reports) : undefined),
    [data],
  );
  const unsignedAlerts = invasive?.alerts ?? [];

  const photosQuery = useQuery({
    queryKey: ["analytics", "alertPhotos", unsignedAlerts.map((a) => a.id)],
    queryFn: () => signAlertPhotos(unsignedAlerts),
    enabled: unsignedAlerts.length > 0,
    staleTime: signedUrlStaleTimeMs,
  });
  const signedById = new Map(
    (photosQuery.data ?? []).map((alert) => [alert.id, alert]),
  );

  const cells = cellsQuery.data;
  // Kept stable between renders so the map only redraws when they change.
  const hotspots = useMemo(
    () => toMappedHotspots(toSightingHotspots(cells ?? [], category)),
    [cells, category],
  );
  const cellCount = cells?.length ?? 0;

  return {
    category,
    categoryOptions: reportCategories,
    changeCategory: setCategory,
    hotspots,
    hotspotsState: toCardQueryState(cellsQuery),
    /** No area in this date range has enough reports to show. */
    isHotspotsEmpty: cellCount === 0,
    /** Areas exist, but none has a report in the chosen category. */
    isCategoryEmpty: cellCount > 0 && hotspots.length === 0,

    /** Null when there's no usable token or the map failed to load. */
    mapToken: hasMapFailed ? null : token,
    reportMapFailed: () => {
      setHasMapFailed(true);
    },
    fitAllRequest,
    showAllHotspots: () => {
      setFitAllRequest((count) => count + 1);
    },

    // Shown without photos until they are signed.
    alerts: unsignedAlerts.map((alert) => signedById.get(alert.id) ?? alert),
    /** Every invasive report in the range, not just those listed. */
    alertCount: invasive?.total ?? 0,
    alertsState: toCardQueryState(dataQuery),
    // TODO(moderation): "View all" needs an invasive-species list (e.g. an
    // invasive filter on Post Approvals). Visual only until then.
    isViewAllAlertsAvailable: false,
  };
}

export type HotspotsViewModel = ReturnType<typeof useHotspotsViewModel>;
