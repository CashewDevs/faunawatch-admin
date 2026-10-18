import { useEffect, useRef } from "react";
import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { UserSortOption, UserStatusFilter } from "../../models/adminUser";
import type { UserManagementViewModel } from "../../viewmodels/useUserManagementViewModel";

interface UserToolbarProps {
  viewModel: UserManagementViewModel;
}

const statusFilters: readonly UserStatusFilter[] = [
  "all",
  "active",
  "suspended",
];
const sortOptions: readonly UserSortOption[] = ["newest", "oldest", "name"];

/**
 * Search box (⌘K / Ctrl+K to focus), status filter, and sort dropdown.
 */
export function UserToolbar({ viewModel }: UserToolbarProps) {
  const strings = AppStrings.users;
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => {
      window.removeEventListener("keydown", focusSearch);
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4">
      <div className="relative min-w-60 flex-1 md:max-w-[512px]">
        <img
          src={AppAssets.users.iconSearch}
          alt=""
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
        />
        <input
          ref={searchRef}
          type="search"
          aria-label={strings.searchLabel}
          placeholder={strings.searchPlaceholder}
          value={viewModel.searchInput}
          onChange={(event) => {
            viewModel.changeSearch(event.target.value);
          }}
          className="w-full rounded-xl bg-surface-tint/70 py-[11px] pr-16 pl-10 text-sm text-navy placeholder:text-muted focus:outline-2 focus:outline-primary"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded bg-chip px-1.5 py-0.5 font-sans text-[10px] leading-[15px] font-bold tracking-[0.5px] text-navy uppercase">
          {strings.searchShortcut}
        </kbd>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label={strings.statusFilterLabel}
          className="flex items-center rounded-xl bg-surface-tint p-1"
        >
          {statusFilters.map((filter) => {
            const isSelected = viewModel.status === filter;
            return (
              <button
                key={filter}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  viewModel.changeStatus(filter);
                }}
                className={`rounded-lg px-3 py-1.5 text-[13px] leading-[19.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                  isSelected
                    ? "bg-white text-primary drop-shadow-xs"
                    : "text-muted hover:text-navy"
                }`}
              >
                {strings.statusFilter[filter]}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <select
            aria-label={strings.sortLabel}
            value={viewModel.sort}
            onChange={(event) => {
              viewModel.changeSort(event.target.value as UserSortOption);
            }}
            className="min-w-[162px] cursor-pointer appearance-none rounded-xl bg-surface-tint py-2 pr-8 pl-3.5 text-xs leading-4 font-semibold tracking-[0.24px] text-navy focus:outline-2 focus:outline-primary"
          >
            {sortOptions.map((option) => (
              <option key={option} value={option}>
                {strings.sortPrefix} {strings.sortOptions[option]}
              </option>
            ))}
          </select>
          <img
            src={AppAssets.users.iconChevronDown}
            alt=""
            className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
          />
        </div>
      </div>
    </div>
  );
}
