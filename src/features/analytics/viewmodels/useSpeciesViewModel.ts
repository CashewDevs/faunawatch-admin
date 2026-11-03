import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { reportCategories } from "../../post-review/models/post";
import {
  getBarPercent,
  getSeverityShares,
  getSpeciesBreakdown,
  toShares,
  type AnalyticsRange,
} from "../models/analytics";
import { analyticsDataQuery } from "./analyticsQueries";
import { toCardQueryState } from "./cardQueryState";

/**
 * Species & Severity tab: the AI's most-reported species, reports per
 * incident category, and the severity tiers with their review times.
 */
export function useSpeciesViewModel(range: AnalyticsRange) {
  const dataQuery = useQuery(analyticsDataQuery(range));
  const data = dataQuery.data;
  const breakdown = useMemo(
    () => (data ? getSpeciesBreakdown(data.reports) : undefined),
    [data],
  );

  const maxSpeciesCount = Math.max(
    0,
    ...(breakdown?.topSpecies.map((species) => species.count) ?? []),
  );

  return {
    topSpecies:
      breakdown?.topSpecies.map((species) => ({
        ...species,
        barPercent: getBarPercent(species.count, maxSpeciesCount),
      })) ?? [],
    categoryShares: breakdown
      ? toShares(breakdown.categoryCounts, reportCategories)
      : [],
    severityShares: breakdown
      ? getSeverityShares(breakdown.severity).map((share) => ({
          ...share,
          medianReviewMinutes:
            breakdown.severity[share.key].medianReviewMinutes,
        }))
      : [],
    state: toCardQueryState(dataQuery),
  };
}

export type SpeciesViewModel = ReturnType<typeof useSpeciesViewModel>;
