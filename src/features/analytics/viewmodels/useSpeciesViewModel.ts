import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { speciesCategories } from "../../post-review/models/post";
import {
  getBarPercent,
  getSeverityShares,
  toShares,
  type AnalyticsRange,
} from "../models/analytics";
import { fetchSpeciesBreakdown } from "../services/analyticsService";
import { toCardQueryState } from "./cardQueryState";

/**
 * Species & Severity tab: most-reported species, posts per species
 * category, and the severity tiers with their review times.
 */
export function useSpeciesViewModel(range: AnalyticsRange) {
  const breakdownQuery = useQuery({
    queryKey: ["analytics", "species", range],
    queryFn: () => fetchSpeciesBreakdown(range),
    placeholderData: keepPreviousData,
  });

  const breakdown = breakdownQuery.data;
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
      ? toShares(breakdown.categoryCounts, speciesCategories)
      : [],
    severityShares: breakdown
      ? getSeverityShares(breakdown.severity).map((share) => ({
          ...share,
          medianReviewMinutes:
            breakdown.severity[share.key].medianReviewMinutes,
        }))
      : [],
    state: toCardQueryState(breakdownQuery),
  };
}

export type SpeciesViewModel = ReturnType<typeof useSpeciesViewModel>;
