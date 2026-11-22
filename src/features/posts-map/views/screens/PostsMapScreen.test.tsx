import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { Route, Routes, useLocation, useParams } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../../../core/constants/appRoutes";
import { AppStrings } from "../../../../core/constants/appStrings";
import {
  fetchAllPosts,
  fetchPostCardMedia,
} from "../../../post-review/services/postsService";
import { getReturnTarget } from "../../../post-review/viewmodels/postNavigation";
import { testPosts, toTestCardData } from "../../../../test/fixtures/posts";
import { createRouterQueryWrapper } from "../../../../test/routerWrapper";
import type { MapPin } from "../../models/postsMap";
import { PostsMapScreen } from "./PostsMapScreen";

const mapbox = vi.hoisted((): { token: string | null } => ({
  token: "pk.test",
}));

vi.mock("../../../../core/constants/featureFlags", () => ({
  isRequestChangesEnabled: () => false,
}));

vi.mock("../../../../core/services/mapboxConfig", () => ({
  getMapboxToken: () => mapbox.token,
}));

vi.mock("../../../post-review/services/postsService", () => ({
  fetchAllPosts: vi.fn(),
  fetchPostCardMedia: vi.fn(),
}));

// jsdom has no WebGL, so a stand-in draws each pin as a button and the
// card beside them.
vi.mock("../components/PostsMap", () => ({
  PostsMap: ({
    pins,
    mode,
    card,
    onSelect,
  }: {
    pins: readonly MapPin[];
    mode: string;
    card: ReactNode;
    onSelect: (id: string) => void;
  }) => (
    <div data-testid="map" data-mode={mode}>
      {pins.map((pin) => (
        <button
          key={pin.id}
          type="button"
          data-pin=""
          aria-label={pin.label}
          onClick={() => {
            onSelect(pin.id);
          }}
        />
      ))}
      {card}
    </div>
  ),
}));

const strings = AppStrings.postsMap;
const firstPost = testPosts[0];
if (!firstPost) throw new Error("Test posts are missing");

function DetailProbe() {
  const { postId } = useParams();
  const target = getReturnTarget(useLocation().state);
  return (
    <p>
      Opened {postId} from {target.path} ({target.section})
    </p>
  );
}

function renderScreen(initialEntry = "/map") {
  return render(
    <Routes>
      <Route path={AppRoutes.map} element={<PostsMapScreen />} />
      <Route path={AppRoutes.postDetail} element={<DetailProbe />} />
    </Routes>,
    { wrapper: createRouterQueryWrapper(initialEntry) },
  );
}

async function findPins() {
  const map = await screen.findByTestId("map");
  return {
    map,
    pins: () =>
      within(map)
        .queryAllByRole("button")
        .filter((button) => button.hasAttribute("data-pin")),
  };
}

describe("PostsMapScreen", () => {
  beforeEach(() => {
    mapbox.token = "pk.test";
    vi.mocked(fetchAllPosts).mockReset();
    vi.mocked(fetchAllPosts).mockResolvedValue([...testPosts]);
    vi.mocked(fetchPostCardMedia).mockImplementation((posts) =>
      Promise.resolve(posts.map(toTestCardData)),
    );
  });

  it("shows every post as a pin with status chips and counts", async () => {
    renderScreen();
    const { pins } = await findPins();
    expect(await screen.findAllByLabelText(/Pending Review$/)).toHaveLength(18);
    expect(pins()).toHaveLength(30);

    const filters = screen.getByRole("group", { name: strings.filtersLabel });
    expect(
      within(filters)
        .getAllByRole("button")
        .map((chip) => chip.textContent),
    ).toEqual(["Pending18", "Approved7", "Declined5"]);
  });

  it("hides a status's pins when its chip is switched off", async () => {
    const user = userEvent.setup();
    renderScreen();
    const { pins } = await findPins();
    await screen.findAllByLabelText(/Pending Review$/);

    const pending = screen.getByRole("button", { name: /^Pending/ });
    expect(pending).toHaveAttribute("aria-pressed", "true");
    await user.click(pending);
    expect(pending).toHaveAttribute("aria-pressed", "false");
    expect(pins()).toHaveLength(12);

    for (const name of [/^Approved/, /^Declined/]) {
      await user.click(screen.getByRole("button", { name }));
    }
    expect(pins()).toHaveLength(0);
    expect(screen.getByText(strings.filteredEmpty)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: strings.showAll }));
    expect(pins()).toHaveLength(30);
  });

  it("switches between 3D and 2D", async () => {
    const user = userEvent.setup();
    renderScreen();
    const { map } = await findPins();
    expect(map).toHaveAttribute("data-mode", "3d");

    await user.click(screen.getByRole("button", { name: "2D" }));
    expect(map).toHaveAttribute("data-mode", "2d");
    expect(screen.getByRole("button", { name: "2D" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("opens a pin's summary and goes to the full post and back", async () => {
    const user = userEvent.setup();
    renderScreen();
    await findPins();

    const [pin] = await screen.findAllByLabelText(
      "Philippine Tarsier, Pending Review",
    );
    if (!pin) throw new Error("Pin is missing");
    await user.click(pin);

    const card = screen.getByRole("article", { name: strings.card.label });
    expect(
      within(card).getByRole("heading", { name: "Philippine Tarsier" }),
    ).toBeInTheDocument();
    expect(within(card).getByText("Pending Review")).toBeInTheDocument();
    expect(
      within(card).getByText(`Post #${firstPost.reference}`, { exact: false }),
    ).toBeInTheDocument();
    expect(
      within(card).getByText(strings.card.unknownPlace),
    ).toBeInTheDocument();

    await user.click(
      within(card).getByRole("link", { name: /See full details/ }),
    );
    expect(
      screen.getByText(
        `Opened ${firstPost.id} from /map?post=${firstPost.id} (map)`,
      ),
    ).toBeInTheDocument();
  });

  it("closes the summary", async () => {
    const user = userEvent.setup();
    renderScreen(`/map?post=${firstPost.id}`);
    const card = await screen.findByRole("article", {
      name: strings.card.label,
    });
    await user.click(
      within(card).getByRole("button", { name: strings.card.close }),
    );
    expect(
      screen.queryByRole("article", { name: strings.card.label }),
    ).not.toBeInTheDocument();
  });

  it("says when there are no posts yet", async () => {
    vi.mocked(fetchAllPosts).mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText(strings.empty)).toBeInTheDocument();
  });

  it("offers a retry when posts fail to load", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchAllPosts).mockRejectedValueOnce(new Error("offline"));
    renderScreen();
    expect(await screen.findByRole("alert")).toHaveTextContent(strings.error);

    await user.click(screen.getByRole("button", { name: strings.retry }));
    const { pins } = await findPins();
    await screen.findAllByLabelText(/Pending Review$/);
    expect(pins()).toHaveLength(30);
  });

  it("says the map is unavailable without a Mapbox token", () => {
    mapbox.token = null;
    renderScreen();
    expect(screen.getByText(strings.mapUnavailable)).toBeInTheDocument();
    expect(screen.queryByTestId("map")).not.toBeInTheDocument();
  });
});
