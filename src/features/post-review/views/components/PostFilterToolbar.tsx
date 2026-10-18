import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import {
  postRegions,
  postSeverities,
  postSortOptions,
  speciesCategories,
  type Filter,
  type PostRegion,
  type PostSeverity,
  type PostSortOption,
  type SpeciesCategory,
} from "../../models/post";
import type { PostApprovalsViewModel } from "../../viewmodels/usePostApprovalsViewModel";

interface PostFilterToolbarProps {
  viewModel: PostApprovalsViewModel;
}

/**
 * Search box, severity / species / region filters, sort, and clear.
 */
export function PostFilterToolbar({ viewModel }: PostFilterToolbarProps) {
  const strings = AppStrings.posts;
  const filters = strings.filters;

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-3.5 drop-shadow-xs">
      <div className="relative w-full max-w-[448px] min-w-[260px]">
        <img
          src={AppAssets.postApprovals.iconSearch}
          alt=""
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
        <input
          type="search"
          aria-label={strings.searchLabel}
          placeholder={strings.searchPlaceholder}
          value={viewModel.searchInput}
          onChange={(event) => {
            viewModel.changeSearch(event.target.value);
          }}
          className="w-full rounded-lg bg-surface-tint py-[9px] pr-4 pl-10 text-sm text-ink placeholder:text-muted focus:outline-2 focus:outline-primary"
        />
      </div>

      <div
        role="group"
        aria-label={filters.label}
        className="flex flex-wrap items-center gap-2"
      >
        <FilterSelect<Filter<PostSeverity>>
          label={filters.severityLabel}
          value={viewModel.severity}
          onChange={viewModel.changeSeverity}
          options={[
            {
              value: "all",
              label: `${filters.severityPrefix} ${filters.allSeverities}`,
            },
            ...postSeverities.map((severity) => ({
              value: severity,
              label: `${filters.severityPrefix} ${strings.severity[severity]}`,
            })),
          ]}
        />
        <FilterSelect<Filter<SpeciesCategory>>
          label={filters.categoryLabel}
          value={viewModel.category}
          onChange={viewModel.changeCategory}
          options={[
            {
              value: "all",
              label: `${filters.categoryPrefix} ${filters.allCategories}`,
            },
            ...speciesCategories.map((category) => ({
              value: category,
              label: `${filters.categoryPrefix} ${strings.category[category]}`,
            })),
          ]}
        />
        <FilterSelect<Filter<PostRegion>>
          label={filters.regionLabel}
          value={viewModel.region}
          onChange={viewModel.changeRegion}
          options={[
            {
              value: "all",
              label: `${filters.regionPrefix} ${filters.allRegions}`,
            },
            ...postRegions.map((region) => ({
              value: region,
              label: `${filters.regionPrefix} ${strings.region[region]}`,
            })),
          ]}
        />
        <FilterSelect<PostSortOption>
          label={filters.sortLabel}
          value={viewModel.sort}
          onChange={viewModel.changeSort}
          options={postSortOptions.map((option) => ({
            value: option,
            label: `${filters.sortPrefix} ${strings.sortOptions[option]}`,
          }))}
        />
        <button
          type="button"
          aria-label={filters.clear}
          title={filters.clear}
          disabled={!viewModel.hasActiveFilters}
          onClick={viewModel.clearFilters}
          className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <img src={AppAssets.postApprovals.iconClearFilters} alt="" />
        </button>
      </div>
    </div>
  );
}

interface FilterSelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: FilterSelectProps<T>) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => {
          const selected = options.find(
            (option) => option.value === event.target.value,
          );
          if (selected) onChange(selected.value);
        }}
        className="cursor-pointer appearance-none rounded-lg bg-surface-tint py-2 pr-9 pl-3.5 text-[13px] leading-[18px] text-ink focus:outline-2 focus:outline-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <img
        src={AppAssets.postApprovals.iconChevronDown}
        alt=""
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
      />
    </div>
  );
}
