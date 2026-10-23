import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { AnalyticsViewModel } from "../../viewmodels/useAnalyticsViewModel";
import { SegmentedControl, segmentButtonClass } from "./SegmentedControl";

interface AnalyticsHeaderProps {
  viewModel: AnalyticsViewModel;
}

/**
 * Date-range switch and the Export report button, beside the tab strip.
 */
export function AnalyticsHeader({ viewModel }: AnalyticsHeaderProps) {
  const strings = AppStrings.analytics;

  return (
    <div className="flex flex-wrap items-center justify-end gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          label={strings.rangeLabel}
          options={viewModel.ranges.map((range) => ({
            value: range,
            label: strings.ranges[range],
          }))}
          value={viewModel.range}
          onChange={viewModel.changeRange}
        >
          <button
            type="button"
            disabled={!viewModel.isCustomRangeAvailable}
            title={
              viewModel.isCustomRangeAvailable
                ? undefined
                : strings.customRangeUnavailable
            }
            className={`${segmentButtonClass} flex items-center gap-1.5 text-slate`}
          >
            {strings.customRange}
            <img src={AppAssets.postDetail.iconCalendar} alt="" />
          </button>
        </SegmentedControl>
        <button
          type="button"
          disabled={!viewModel.isExportAvailable}
          title={
            viewModel.isExportAvailable ? undefined : strings.exportUnavailable
          }
          className="flex items-center gap-2.5 rounded-xl bg-primary px-5 py-3 text-base leading-6 font-semibold text-white shadow-button transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary"
        >
          <img src={AppAssets.analytics.iconExport} alt="" />
          {strings.exportReport}
        </button>
      </div>
    </div>
  );
}
