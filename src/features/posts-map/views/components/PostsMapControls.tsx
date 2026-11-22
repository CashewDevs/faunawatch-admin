import { AppStrings } from "../../../../core/constants/appStrings";
import { formatNumber } from "../../../../core/utils/formatters";
import type { PostsMapViewModel } from "../../viewmodels/usePostsMapViewModel";
import { mapStatusFill } from "./mapStatusColors";

const viewModes = ["3d", "2d"] as const;

/**
 * The floating bar over the map: a chip per review status (switch each on
 * or off; its dot is the pin colour), the 3D/2D switch, and "Show all pins".
 */
export function PostsMapControls({
  viewModel,
}: {
  viewModel: PostsMapViewModel;
}) {
  const strings = AppStrings.postsMap;
  const is2d = viewModel.viewMode === "2d";

  return (
    <div
      role="toolbar"
      aria-label={strings.controlsLabel}
      className="flex animate-fade-in-up flex-wrap items-center gap-2 rounded-xl bg-white/90 p-1.5 shadow-md ring-1 ring-navy/5 backdrop-blur-md motion-reduce:animate-none"
    >
      <div
        role="group"
        aria-label={strings.filtersLabel}
        className="flex flex-wrap items-center gap-1"
      >
        {viewModel.statusFilters.map((filter) => (
          <button
            key={filter.status}
            type="button"
            aria-pressed={filter.isShown}
            onClick={() => {
              viewModel.toggleStatus(filter.status);
            }}
            className="group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-muted transition-colors duration-200 hover:bg-surface-tint aria-pressed:bg-surface-tint aria-pressed:text-deep-blue focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              className={`size-2.5 rounded-full opacity-30 ring-2 ring-white transition-[opacity,scale] duration-200 group-aria-pressed:scale-125 group-aria-pressed:opacity-100 ${mapStatusFill[filter.status]}`}
            />
            {filter.label}
            <span className="rounded-full bg-white px-1.5 text-[11px] leading-4 font-bold text-slate tabular-nums">
              {formatNumber(filter.count)}
            </span>
          </button>
        ))}
      </div>

      <span aria-hidden="true" className="h-6 w-px bg-border/70" />

      <div
        role="group"
        aria-label={strings.viewModeLabel}
        className="relative grid grid-cols-2 rounded-lg bg-surface-tint p-1"
      >
        {/* Slides under the chosen option. */}
        <span
          aria-hidden="true"
          className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-md bg-deep-blue shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none ${is2d ? "translate-x-full" : "translate-x-0"}`}
        />
        {viewModes.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={viewModel.viewMode === mode}
            onClick={() => {
              viewModel.setViewMode(mode);
            }}
            className="relative rounded-md px-3 py-1 text-sm font-extrabold text-deep-blue transition-colors duration-300 aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-primary"
          >
            {strings.viewMode[mode]}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={viewModel.fitAllPins}
        disabled={viewModel.pins.length === 0}
        className="rounded-lg px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {strings.fitAll}
      </button>
    </div>
  );
}
