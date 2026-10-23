import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppStrings } from "../../../../core/constants/appStrings";
import { createRouterQueryWrapper } from "../../../../test/routerWrapper";
import { mockUserStats } from "../../../users/services/mockUsers";
import { fetchUserStats } from "../../../users/services/usersService";
import {
  fetchHotspots,
  fetchInvasiveAlerts,
  fetchModerationActivity,
  fetchPostTrend,
  fetchReviewOutcomes,
  fetchSpeciesBreakdown,
  fetchTopContributors,
} from "../../services/analyticsService";
import {
  mockHotspots,
  mockInvasiveAlerts,
  mockModerationActivity,
  mockPostTrend,
  mockReviewOutcomes,
  mockSpeciesBreakdown,
  mockTopContributors,
} from "../../services/mockAnalytics";
import { AnalyticsScreen } from "./AnalyticsScreen";

vi.mock("../../services/analyticsService", () => ({
  fetchPostTrend: vi.fn(),
  fetchReviewOutcomes: vi.fn(),
  fetchSpeciesBreakdown: vi.fn(),
  fetchHotspots: vi.fn(),
  fetchInvasiveAlerts: vi.fn(),
  fetchTopContributors: vi.fn(),
  fetchModerationActivity: vi.fn(),
}));

vi.mock("../../../users/services/usersService", () => ({
  fetchUserStats: vi.fn(),
}));

const strings = AppStrings.analytics;
const now = new Date("2026-10-30T00:00:00Z");

function renderScreen(initialEntry = "/analytics") {
  return render(<AnalyticsScreen />, {
    wrapper: createRouterQueryWrapper(initialEntry),
  });
}

describe("AnalyticsScreen", () => {
  beforeEach(() => {
    vi.mocked(fetchUserStats).mockResolvedValue(mockUserStats);
    vi.mocked(fetchPostTrend).mockImplementation((range, granularity) =>
      Promise.resolve(mockPostTrend(range, granularity, now)),
    );
    vi.mocked(fetchReviewOutcomes).mockImplementation((range) =>
      Promise.resolve(mockReviewOutcomes(range)),
    );
    vi.mocked(fetchSpeciesBreakdown).mockImplementation((range) =>
      Promise.resolve(mockSpeciesBreakdown(range)),
    );
    vi.mocked(fetchHotspots).mockImplementation((range, category) =>
      Promise.resolve(mockHotspots(range, category)),
    );
    vi.mocked(fetchInvasiveAlerts).mockImplementation((range) =>
      Promise.resolve(mockInvasiveAlerts(range, now)),
    );
    vi.mocked(fetchTopContributors).mockImplementation((range) =>
      Promise.resolve(mockTopContributors(range, 5)),
    );
    vi.mocked(fetchModerationActivity).mockImplementation((range) =>
      Promise.resolve(mockModerationActivity(range)),
    );
  });

  it("opens on the Overview tab with user stats and review outcomes", async () => {
    renderScreen();

    expect(
      screen.getByRole("tab", { name: strings.tabs.overview }),
    ).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("1,420")).toBeInTheDocument();
    expect(await screen.findByText("3,842")).toBeInTheDocument();
    expect(screen.getByText("89.1% Approved")).toBeInTheDocument();
  });

  it("keeps report export and custom ranges disabled", () => {
    renderScreen();
    expect(
      screen.getByRole("button", { name: strings.exportReport }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: strings.customRange }),
    ).toBeDisabled();
  });

  it("switches tabs by click and arrow keys", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole("tab", { name: strings.tabs.species }));
    const panel = screen.getByRole("tabpanel");
    expect(
      await within(panel).findByText("Philippine Tarsier"),
    ).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(
      screen.getByRole("tab", { name: strings.tabs.hotspots }),
    ).toHaveFocus();
    expect(await screen.findByText("Cane Toad")).toBeInTheDocument();

    await user.keyboard("{End}");
    expect(
      await screen.findByRole("table", { name: strings.contributors.caption }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Dr. Aris Thorne")).toBeInTheDocument();
  });

  it("reloads the tab's data for a new date range", async () => {
    const user = userEvent.setup();
    renderScreen("/analytics?tab=species");
    expect(await screen.findByText("482")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: strings.ranges["7d"] }),
    );

    expect(await screen.findByText("116")).toBeInTheDocument();
    expect(fetchSpeciesBreakdown).toHaveBeenLastCalledWith("7d");
  });

  it("shows an error with a retry when a card fails to load", async () => {
    vi.mocked(fetchTopContributors).mockRejectedValue(new Error("offline"));
    renderScreen("/analytics?tab=moderation");

    expect(await screen.findByText(strings.error)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: strings.retry }),
    ).toBeInTheDocument();
  });
});
