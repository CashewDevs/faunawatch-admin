import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { speciesCategories } from "../../post-review/models/post";
import {
  placeHotspots,
  type AnalyticsRange,
  type HotspotCategoryFilter,
} from "../models/analytics";
import {
  fetchHotspots,
  fetchInvasiveAlerts,
} from "../services/analyticsService";
import { toCardQueryState } from "./cardQueryState";

/**
 * Hotspots & Invasives tab: sightings per conservation sector (filterable
 * by species category) and recent invasive-species reports.
 */
export function useHotspotsViewModel(range: AnalyticsRange) {
  const [category, setCategory] = useState<HotspotCategoryFilter>("all");

  const hotspotsQuery = useQuery({
    queryKey: ["analytics", "hotspots", range, category],
    queryFn: () => fetchHotspots(range, category),
    placeholderData: keepPreviousData,
  });

  const alertsQuery = useQuery({
    queryKey: ["analytics", "invasiveAlerts", range],
    queryFn: () => fetchInvasiveAlerts(range),
    placeholderData: keepPreviousData,
  });

  return {
    category,
    categoryOptions: speciesCategories,
    changeCategory: setCategory,
    hotspots: placeHotspots(hotspotsQuery.data ?? []),
    hotspotsState: toCardQueryState(hotspotsQuery),
    alerts: alertsQuery.data ?? [],
    alertsState: toCardQueryState(alertsQuery),
    // TODO(moderation): "View all" needs an invasive-species list (e.g. an
    // invasive filter on Post Approvals). Visual only until then.
    isViewAllAlertsAvailable: false,
  };
}

export type HotspotsViewModel = ReturnType<typeof useHotspotsViewModel>;
