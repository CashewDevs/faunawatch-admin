import type { AnalyticsRange, AnalyticsTab } from "../../models/analytics";
import { useAnalyticsViewModel } from "../../viewmodels/useAnalyticsViewModel";
import { AnalyticsHeader } from "../components/AnalyticsHeader";
import { AnalyticsTabs } from "../components/AnalyticsTabs";
import { getTabId, getTabPanelId } from "../components/analyticsTabIds";
import { HotspotsTab } from "../components/HotspotsTab";
import { ModerationTab } from "../components/ModerationTab";
import { OverviewTab } from "../components/OverviewTab";
import { SpeciesTab } from "../components/SpeciesTab";

/**
 * Analytics: date-range switch and four tabs (Overview, Species & Severity,
 * Hotspots & Invasives, Contributors & Moderation). Tab and range live in
 * the URL.
 */
export function AnalyticsScreen() {
  const viewModel = useAnalyticsViewModel();

  return (
    <div className="flex flex-1 animate-fade-in flex-col gap-6 px-8 pt-5 pb-10 motion-reduce:animate-none">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <AnalyticsTabs viewModel={viewModel} />
        <AnalyticsHeader viewModel={viewModel} />
      </div>
      <div
        role="tabpanel"
        id={getTabPanelId(viewModel.tab)}
        aria-labelledby={getTabId(viewModel.tab)}
      >
        <TabContent tab={viewModel.tab} range={viewModel.range} />
      </div>
    </div>
  );
}

function TabContent({
  tab,
  range,
}: {
  tab: AnalyticsTab;
  range: AnalyticsRange;
}) {
  switch (tab) {
    case "overview":
      return <OverviewTab range={range} />;
    case "species":
      return <SpeciesTab range={range} />;
    case "hotspots":
      return <HotspotsTab range={range} />;
    case "moderation":
      return <ModerationTab range={range} />;
  }
}
