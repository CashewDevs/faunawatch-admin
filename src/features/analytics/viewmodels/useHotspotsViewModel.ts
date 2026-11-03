import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { reportCategories } from "../../post-review/models/post";
import { signedUrlStaleTimeMs } from "../../post-review/viewmodels/postQueries";
import {
  getInvasiveAlerts,
  placeHotspots,
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
 * category) and the newest reports the AI flagged as possibly invasive.
 */
export function useHotspotsViewModel(range: AnalyticsRange) {
  const [category, setCategory] = useState<HotspotCategoryFilter>("all");

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

  return {
    category,
    categoryOptions: reportCategories,
    changeCategory: setCategory,
    hotspots: placeHotspots(
      toSightingHotspots(cellsQuery.data ?? [], category),
    ),
    hotspotsState: toCardQueryState(cellsQuery),
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
