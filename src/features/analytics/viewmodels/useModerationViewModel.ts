import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  declineReasons,
  getContributorApprovalRate,
  getReviewerShares,
  toShares,
  type AnalyticsRange,
} from "../models/analytics";
import {
  fetchModerationActivity,
  fetchTopContributors,
} from "../services/analyticsService";
import { toCardQueryState } from "./cardQueryState";

/**
 * Contributors & Moderation tab: the submission leaderboard, how decisions
 * were split between reviewers, and the most common decline reasons.
 */
export function useModerationViewModel(range: AnalyticsRange) {
  const contributorsQuery = useQuery({
    queryKey: ["analytics", "topContributors", range],
    queryFn: () => fetchTopContributors(range),
    placeholderData: keepPreviousData,
  });

  const activityQuery = useQuery({
    queryKey: ["analytics", "moderationActivity", range],
    queryFn: () => fetchModerationActivity(range),
    placeholderData: keepPreviousData,
  });

  const activity = activityQuery.data;

  return {
    contributors: (contributorsQuery.data ?? []).map((contributor, index) => ({
      ...contributor,
      rank: index + 1,
      approvalRate: getContributorApprovalRate(contributor),
    })),
    contributorsState: toCardQueryState(contributorsQuery),
    reviewerShares: activity ? getReviewerShares(activity.reviewers) : [],
    // Largest first; each reason keeps its own colour whatever its rank.
    declineReasonShares: activity
      ? toShares(activity.declineReasonCounts, declineReasons).sort(
          (a, b) => b.count - a.count,
        )
      : [],
    activityState: toCardQueryState(activityQuery),
  };
}

export type ModerationViewModel = ReturnType<typeof useModerationViewModel>;
