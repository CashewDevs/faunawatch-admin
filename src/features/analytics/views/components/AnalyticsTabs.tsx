import { useRef, type KeyboardEvent } from "react";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { AnalyticsTab } from "../../models/analytics";
import type { AnalyticsViewModel } from "../../viewmodels/useAnalyticsViewModel";
import { getTabId, getTabPanelId } from "./analyticsTabIds";

interface AnalyticsTabsProps {
  viewModel: AnalyticsViewModel;
}

/**
 * Tab strip for the four analytics sections. Arrow keys, Home, and End
 * move between tabs (and select them), per the ARIA tabs pattern.
 */
export function AnalyticsTabs({ viewModel }: AnalyticsTabsProps) {
  const strings = AppStrings.analytics;
  const tabRefs = useRef(new Map<AnalyticsTab, HTMLButtonElement>());
  const { tabs } = viewModel;

  const selectByIndex = (index: number) => {
    const tab = tabs[(index + tabs.length) % tabs.length];
    if (!tab) return;
    viewModel.changeTab(tab);
    tabRefs.current.get(tab)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = tabs.indexOf(viewModel.tab);
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectByIndex(next);
  };

  return (
    <div
      role="tablist"
      aria-label={strings.tabsLabel}
      className="flex flex-wrap items-center gap-2"
    >
      {tabs.map((tab) => {
        const isSelected = viewModel.tab === tab;
        return (
          <button
            key={tab}
            ref={(element) => {
              if (element) tabRefs.current.set(tab, element);
              else tabRefs.current.delete(tab);
            }}
            id={getTabId(tab)}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={getTabPanelId(tab)}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => {
              viewModel.changeTab(tab);
            }}
            onKeyDown={handleKeyDown}
            className={`rounded-lg px-4 py-2 text-base leading-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              isSelected
                ? "bg-primary text-white drop-shadow-xs"
                : "text-slate hover:bg-surface-tint"
            }`}
          >
            {strings.tabs[tab]}
          </button>
        );
      })}
    </div>
  );
}
