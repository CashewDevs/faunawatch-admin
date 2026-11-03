import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AppStrings } from "../../../core/constants/appStrings";
import {
  declineReasons,
  getContributorApprovalRate,
  getModerationActivity,
  getReviewerShares,
  getTopContributors,
  toShares,
  type AnalyticsRange,
} from "../models/analytics";
import { analyticsDataQuery } from "./analyticsQueries";
import { toCardQueryState } from "./cardQueryState";

/**
 * Contributors & Moderation tab: the submission leaderboard, how decisions
 * were split between reviewers, and the most common decline reasons.
 */
export function useModerationViewModel(range: AnalyticsRange) {
  const dataQuery = useQuery(analyticsDataQuery(range));
  const data = dataQuery.data;

  const contributors = useMemo(
    () => (data ? getTopContributors(data.reports) : []),
    [data],
  );
  const activity = useMemo(
    () =>
      data
        ? getModerationActivity(
            data.reviews,
            data.reviewerNames,
            AppStrings.analytics.moderation.unknownReviewer,
          )
        : undefined,
    [data],
  );
  const state = toCardQueryState(dataQuery);

  return {
    contributors: contributors.map((contributor, index) => ({
      ...contributor,
      rank: index + 1,
      approvalRate: getContributorApprovalRate(contributor),
    })),
    contributorsState: state,
    reviewerShares: activity ? getReviewerShares(activity.reviewers) : [],
    // Largest first, without reasons nobody used; each reason keeps its own
    // colour whatever its rank.
    declineReasonShares: activity
      ? toShares(activity.declineReasonCounts, declineReasons)
          .filter((share) => share.count > 0)
          .sort((a, b) => b.count - a.count)
      : [],
    activityState: state,
  };
}

export type ModerationViewModel = ReturnType<typeof useModerationViewModel>;
