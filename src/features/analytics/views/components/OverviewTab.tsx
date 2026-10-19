import { UserStatsCards } from "../../../users/views/components/UserStatsCards";
import type { AnalyticsRange } from "../../models/analytics";
import { useOverviewViewModel } from "../../viewmodels/useOverviewViewModel";
import { PostsOverTimeCard } from "./PostsOverTimeCard";
import { ReviewOutcomesCard } from "./ReviewOutcomesCard";

/**
 * Overview tab: user stats row, posts over time, and review outcomes.
 */
export function OverviewTab({ range }: { range: AnalyticsRange }) {
  const viewModel = useOverviewViewModel(range);

  return (
    <div className="flex flex-col gap-6">
      <UserStatsCards
        stats={viewModel.userStats}
        activeRate={viewModel.activeRate}
        widthClass="w-full"
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <PostsOverTimeCard viewModel={viewModel} />
        <ReviewOutcomesCard viewModel={viewModel} range={range} />
      </div>
    </div>
  );
}
