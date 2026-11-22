import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppStrings } from "../../../../core/constants/appStrings";
import {
  testAnalyticsData,
  testSectorCells,
} from "../../../../test/fixtures/analytics";
import { createQueryWrapper } from "../../../../test/queryWrapper";
import type { MappedHotspot } from "../../models/analytics";
import {
  fetchAnalyticsData,
  fetchSectorCells,
  signAlertPhotos,
} from "../../services/analyticsService";
import { HotspotsTab } from "./HotspotsTab";

const strings = AppStrings.analytics.hotspots;

const mapbox = vi.hoisted((): { token: string | null } => ({
  token: "pk.test",
}));

vi.mock("../../../../core/services/mapboxConfig", () => ({
  getMapboxToken: () => mapbox.token,
}));

vi.mock("../../services/analyticsService", () => ({
  fetchAnalyticsData: vi.fn(),
  fetchSectorCells: vi.fn(),
  signAlertPhotos: vi.fn(),
}));

// jsdom has no WebGL, so a stand-in lists each circle and can fail.
vi.mock("./HotspotsMap", () => ({
  HotspotsMap: ({
    hotspots,
    fitAllRequest,
    label,
    onError,
  }: {
    hotspots: readonly MappedHotspot[];
    fitAllRequest: number;
    label: string;
    onError: () => void;
  }) => (
    <div
      role="region"
      aria-label={label}
      data-fit-request={String(fitAllRequest)}
    >
      {hotspots.map((hotspot) => (
        <span
          key={hotspot.id}
          data-testid="circle"
          data-density={hotspot.density}
        >
          {hotspot.name}
        </span>
      ))}
      <button type="button" onClick={onError}>
        Break map
      </button>
    </div>
  ),
}));

function renderTab() {
  return render(<HotspotsTab range="30d" />, {
    wrapper: createQueryWrapper(),
  });
}

async function findMap() {
  return screen.findByRole("region", { name: strings.mapLabel });
}

describe("HotspotsTab", () => {
  beforeEach(() => {
    mapbox.token = "pk.test";
    vi.mocked(fetchAnalyticsData).mockImplementation((range) =>
      Promise.resolve(testAnalyticsData(range)),
    );
    vi.mocked(fetchSectorCells).mockResolvedValue([...testSectorCells]);
    vi.mocked(signAlertPhotos).mockImplementation((alerts) =>
      Promise.resolve([...alerts]),
    );
  });

  it("shows each hotspot on the map with the density legend", async () => {
    renderTab();
    const map = await findMap();

    const circles = within(map).getAllByTestId("circle");
    expect(circles.map((circle) => circle.textContent)).toEqual([
      "14.65°N, 121.05°E",
      "10.35°N, 123.95°E",
      "7.05°N, 125.25°E",
    ]);
    expect(circles.at(-1)).toHaveAttribute("data-density", "critical");
    for (const level of Object.values(strings.density)) {
      expect(screen.getByText(level)).toBeInTheDocument();
    }
    // Screen readers get the same areas as a list.
    expect(
      screen.getByText(
        `7.05°N, 125.25°E: 12 ${strings.sightingsSuffix}, ${strings.density.critical}`,
      ),
    ).toBeInTheDocument();
  });

  it("filters the map by category", async () => {
    const user = userEvent.setup();
    renderTab();
    const map = await findMap();

    await user.selectOptions(
      screen.getByRole("combobox", { name: strings.categoryLabel }),
      "potentially_dangerous_animal",
    );

    expect(
      within(map)
        .getAllByTestId("circle")
        .map((circle) => circle.textContent),
    ).toEqual(["14.65°N, 121.05°E"]);
    expect(screen.queryByText(strings.categoryEmpty)).not.toBeInTheDocument();
  });

  it("says so when a category has no hotspots, keeping the map", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchSectorCells).mockResolvedValue([
      {
        latitude: 10.25,
        longitude: 123.85,
        averageSpot: null,
        categorySpots: {},
        reportCount: 7,
        categoryCounts: { animal_in_need: 7 },
      },
    ]);
    renderTab();
    const map = await findMap();

    await user.selectOptions(
      screen.getByRole("combobox", { name: strings.categoryLabel }),
      "possible_invasive_species",
    );

    expect(screen.getByText(strings.categoryEmpty)).toBeInTheDocument();
    expect(map).toBeInTheDocument();
    expect(within(map).queryAllByTestId("circle")).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: strings.showAll }),
    ).toBeDisabled();
  });

  it("asks the map to fit every hotspot on Show all", async () => {
    const user = userEvent.setup();
    renderTab();
    const map = await findMap();
    expect(map).toHaveAttribute("data-fit-request", "0");

    await user.click(screen.getByRole("button", { name: strings.showAll }));

    expect(map).toHaveAttribute("data-fit-request", "1");
  });

  it("shows Map unavailable without a token, still listing the areas", async () => {
    mapbox.token = null;
    renderTab();

    expect(await screen.findByText(strings.mapUnavailable)).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: strings.mapLabel }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: strings.showAll }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        `7.05°N, 125.25°E: 12 ${strings.sightingsSuffix}, ${strings.density.critical}`,
      ),
    ).toBeInTheDocument();
  });

  it("shows Map unavailable when the map fails to load", async () => {
    const user = userEvent.setup();
    renderTab();
    await findMap();

    await user.click(screen.getByRole("button", { name: "Break map" }));

    expect(screen.getByText(strings.mapUnavailable)).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: strings.mapLabel }),
    ).not.toBeInTheDocument();
  });

  it("shows the empty state when no area has enough reports", async () => {
    vi.mocked(fetchSectorCells).mockResolvedValue([]);
    renderTab();

    expect(
      await screen.findAllByText(AppStrings.analytics.empty),
    ).not.toHaveLength(0);
    expect(
      screen.queryByRole("region", { name: strings.mapLabel }),
    ).not.toBeInTheDocument();
  });
});
