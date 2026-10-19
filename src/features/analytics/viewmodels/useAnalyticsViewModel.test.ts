import { act, renderHook } from "@testing-library/react";
import { useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { createRouterQueryWrapper } from "../../../test/routerWrapper";
import { useAnalyticsViewModel } from "./useAnalyticsViewModel";

function renderViewModel(initialEntry = "/analytics") {
  return renderHook(
    () => ({ viewModel: useAnalyticsViewModel(), location: useLocation() }),
    { wrapper: createRouterQueryWrapper(initialEntry) },
  );
}

describe("useAnalyticsViewModel", () => {
  it("defaults to the Overview tab and the last 30 days", () => {
    const { result } = renderViewModel();
    expect(result.current.viewModel.tab).toBe("overview");
    expect(result.current.viewModel.range).toBe("30d");
    expect(result.current.viewModel.isExportAvailable).toBe(false);
    expect(result.current.viewModel.isCustomRangeAvailable).toBe(false);
  });

  it("reads the tab and range from the URL", () => {
    const { result } = renderViewModel("/analytics?tab=moderation&range=12m");
    expect(result.current.viewModel.tab).toBe("moderation");
    expect(result.current.viewModel.range).toBe("12m");
  });

  it("keeps tab and range changes in the URL", () => {
    const { result } = renderViewModel();

    act(() => {
      result.current.viewModel.changeTab("hotspots");
    });
    act(() => {
      result.current.viewModel.changeRange("7d");
    });

    expect(result.current.viewModel.tab).toBe("hotspots");
    expect(result.current.viewModel.range).toBe("7d");
    expect(result.current.location.search).toBe("?tab=hotspots&range=7d");
  });
});
