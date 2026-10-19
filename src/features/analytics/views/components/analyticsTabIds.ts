import type { AnalyticsTab } from "../../models/analytics";

/** Element ids linking each tab to its panel (aria-controls / labelledby). */
export function getTabId(tab: AnalyticsTab): string {
  return `analytics-tab-${tab}`;
}

export function getTabPanelId(tab: AnalyticsTab): string {
  return `analytics-panel-${tab}`;
}
