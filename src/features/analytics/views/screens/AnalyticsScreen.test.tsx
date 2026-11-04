import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppStrings } from "../../../../core/constants/appStrings";
import { createRouterQueryWrapper } from "../../../../test/routerWrapper";
import {
  testAnalyticsData,
  testSectorCells,
} from "../../../../test/fixtures/analytics";
import { testUserCounts } from "../../../../test/fixtures/users";
import {
  fetchSanctionsSince,
  fetchUserCounts,
} from "../../../users/services/usersService";
import {
  fetchAnalyticsData,
  fetchSectorCells,
  signAlertPhotos,
} from "../../services/analyticsService";
import { AnalyticsScreen } from "./AnalyticsScreen";

vi.mock("../../services/analyticsService", () => ({
  fetchAnalyticsData: vi.fn(),
  fetchSectorCells: vi.fn(),
  signAlertPhotos: vi.fn(),
}));

vi.mock("../../../users/services/usersService", () => ({
  fetchUserCounts: vi.fn(),
  fetchSanctionsSince: vi.fn(),
}));

const strings = AppStrings.analytics;

function renderScreen(initialEntry = "/analytics") {
  return render(<AnalyticsScreen />, {
    wrapper: createRouterQueryWrapper(initialEntry),
  });
}

describe("AnalyticsScreen", () => {
  beforeEach(() => {
    vi.mocked(fetchUserCounts).mockResolvedValue(testUserCounts);
    vi.mocked(fetchSanctionsSince).mockResolvedValue([]);
    vi.mocked(fetchAnalyticsData).mockImplementation((range) =>
      Promise.resolve(testAnalyticsData(range)),
    );
    vi.mocked(fetchSectorCells).mockResolvedValue([...testSectorCells]);
    vi.mocked(signAlertPhotos).mockImplementation((alerts) =>
      Promise.resolve([...alerts]),
    );
  });

  it("opens on the Overview tab with user stats and review outcomes", async () => {
    renderScreen();

    expect(
      screen.getByRole("tab", { name: strings.tabs.overview }),
    ).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("24")).toBeInTheDocument();
    expect(await screen.findByText("66.7% Approved")).toBeInTheDocument();
    expect(
      screen.getByText(strings.reviewOutcomes.outcomes.awaitingTriage),
    ).toBeInTheDocument();
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
      await within(panel).findByText("Philippine Eagle"),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(strings.severity.tiers.unrated.name),
    ).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(
      screen.getByRole("tab", { name: strings.tabs.hotspots }),
    ).toHaveFocus();
    expect(await screen.findAllByText("Cane Toad")).not.toHaveLength(0);
    expect(
      screen.getByText(`5 ${strings.invasive.activeSuffix}`),
    ).toBeInTheDocument();

    await user.keyboard("{End}");
    expect(
      await screen.findByRole("table", { name: strings.contributors.caption }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Maria Santos")).toBeInTheDocument();
  });

  it("reloads the data for a new date range", async () => {
    const user = userEvent.setup();
    renderScreen("/analytics?tab=species");

    // The Philippine Eagle's 30-day count.
    expect(await screen.findByText("6")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: strings.ranges["7d"] }),
    );

    await screen.findByText(strings.ranges["7d"]);
    expect(fetchAnalyticsData).toHaveBeenLastCalledWith("7d");
    await screen.findAllByText("2");
    expect(screen.queryByText("6")).not.toBeInTheDocument();
  });

  it("shows an error with a retry when the data fails to load", async () => {
    vi.mocked(fetchAnalyticsData).mockRejectedValue(new Error("offline"));
    renderScreen("/analytics?tab=moderation");

    expect(await screen.findAllByText(strings.error)).not.toHaveLength(0);
    expect(
      screen.getAllByRole("button", { name: strings.retry }).length,
    ).toBeGreaterThan(0);
  });

  it("shows the empty state for a range without reports", async () => {
    vi.mocked(fetchAnalyticsData).mockImplementation((range) =>
      Promise.resolve({
        ...testAnalyticsData(range),
        reports: [],
        reviews: [],
      }),
    );
    renderScreen("/analytics?tab=species");

    expect(await screen.findAllByText(strings.empty)).toHaveLength(3);
  });
});
