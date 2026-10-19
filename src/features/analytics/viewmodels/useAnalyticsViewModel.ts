import { useSearchParams } from "react-router";
import {
  analyticsRanges,
  analyticsTabs,
  parseAnalyticsParams,
  toAnalyticsParams,
  type AnalyticsRange,
  type AnalyticsTab,
  type AnalyticsView,
} from "../models/analytics";

/**
 * Presentation state for the Analytics screen shell: the selected tab and
 * date range, both kept in the URL so Back and shared links keep the view.
 */
export function useAnalyticsViewModel() {
  const [params, setParams] = useSearchParams();
  const view = parseAnalyticsParams(params);

  const update = (patch: Partial<AnalyticsView>) => {
    setParams(toAnalyticsParams({ ...view, ...patch }));
  };

  return {
    tab: view.tab,
    range: view.range,
    tabs: analyticsTabs,
    ranges: analyticsRanges,
    changeTab: (tab: AnalyticsTab) => {
      update({ tab });
    },
    changeRange: (range: AnalyticsRange) => {
      update({ range });
    },
    // TODO(design): A custom date range needs a date picker (new dependency
    // or native date inputs) and the period rules for odd-length ranges.
    isCustomRangeAvailable: false,
    // TODO(export): Report export is not specified yet (format, which tabs,
    // whether it's generated server-side). Visual only until then.
    isExportAvailable: false,
  };
}

export type AnalyticsViewModel = ReturnType<typeof useAnalyticsViewModel>;
