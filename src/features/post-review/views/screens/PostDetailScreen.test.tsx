import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../../../core/constants/appRoutes";
import { AppStrings } from "../../../../core/constants/appStrings";
import { fetchUsers } from "../../../users/services/usersService";
import { fetchAllPosts, fetchPost } from "../../services/postsService";
import { testPosts, testTarsier } from "../../../../test/fixtures/posts";
import { testUsers } from "../../../../test/fixtures/users";
import { createRouterQueryWrapper } from "../../../../test/routerWrapper";
import { PostDetailScreen } from "./PostDetailScreen";

vi.mock("../../services/postsService", () => ({
  fetchPost: vi.fn(),
  fetchAllPosts: vi.fn(),
}));

vi.mock("../../../users/services/usersService", () => ({
  fetchUsers: vi.fn(),
}));

const posts = AppStrings.posts;
const strings = posts.detail;
const title = posts.category[testTarsier.category];

function renderScreen(postId = testTarsier.id) {
  return render(
    <Routes>
      <Route path={AppRoutes.postDetail} element={<PostDetailScreen />} />
    </Routes>,
    {
      wrapper: createRouterQueryWrapper({
        pathname: `/posts/${postId}`,
        state: { from: "/posts?tab=pending&page=2" },
      }),
    },
  );
}

describe("PostDetailScreen", () => {
  beforeEach(() => {
    vi.mocked(fetchPost).mockImplementation((id) =>
      Promise.resolve(id === testTarsier.id ? testTarsier : null),
    );
    vi.mocked(fetchAllPosts).mockResolvedValue([...testPosts]);
    vi.mocked(fetchUsers).mockResolvedValue([...testUsers]);
  });

  it("renders the post, reporter, and AI analysis", async () => {
    renderScreen();

    expect(
      await screen.findByRole("heading", { level: 2, name: title }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${strings.postPrefix}${testTarsier.reference}`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: strings.ai.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(strings.ai.subheading)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Philippine Tarsier" }),
    ).toBeInTheDocument();
    expect(screen.getByText(posts.confidence.high)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText(/92\.9% Approval Rate/)).toBeInTheDocument();
  });

  it("shows the reporter's ID, notes, and the EXIF-derived fields", async () => {
    renderScreen();
    await screen.findByRole("heading", { level: 2, name: title });

    expect(screen.getByText(strings.ai.reporterSpecies)).toBeInTheDocument();
    expect(screen.getByText("Tarsier")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: strings.reporterNotesHeading }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Watched it for ten minutes from the trail."),
    ).toBeInTheDocument();
    expect(screen.getByText("Canon EOS R5")).toBeInTheDocument();
    expect(screen.getByText(strings.location.exifVerified)).toBeInTheDocument();
    expect(screen.getByText("Photo matches the report")).toBeInTheDocument();
    expect(screen.getByText("Blur check")).toBeInTheDocument();
    expect(
      screen.getByText("Keep a quiet distance and avoid flash photography."),
    ).toBeInTheDocument();
  });

  it("shows the unavailable state without an AI analysis", async () => {
    vi.mocked(fetchPost).mockResolvedValue({
      ...testTarsier,
      aiMatch: null,
      reporterSpecies: null,
      severity: "unrated",
      ai: null,
      location: { ...testTarsier.location, exifCheck: "noGps" },
    });
    renderScreen();
    await screen.findByRole("heading", { level: 2, name: title });

    expect(screen.getByText(strings.ai.unavailable)).toBeInTheDocument();
    expect(screen.queryByText(strings.ai.checklist)).not.toBeInTheDocument();
    expect(screen.getByText(strings.location.exifNoGps)).toBeInTheDocument();
  });

  it("links back to the list it came from", async () => {
    renderScreen();
    await screen.findByRole("heading", { level: 2, name: title });

    expect(screen.getByRole("link", { name: strings.back })).toHaveAttribute(
      "href",
      "/posts?tab=pending&page=2",
    );
  });

  it("switches photos and their EXIF overlays from the thumbnails", async () => {
    const user = userEvent.setup();
    renderScreen();
    const gallery = await screen.findByRole("region", {
      name: strings.gallery.label,
    });
    expect(within(gallery).getByText(strings.gallery.noFlash)).toBeVisible();

    await user.click(
      within(gallery).getByRole("button", {
        name: `${strings.gallery.photo} 2`,
      }),
    );

    expect(
      within(gallery).getByRole("button", {
        name: `${strings.gallery.photo} 2`,
      }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      within(gallery).getByRole("img", { name: /Photo 2 \/ 4/ }),
    ).toHaveAttribute("src", testTarsier.photos[1]?.url);
    expect(within(gallery).getByText(strings.gallery.flashUsed)).toBeVisible();
    expect(
      within(gallery).getByText("f/2.8 • 1/120s • ISO 900"),
    ).toBeInTheDocument();
  });

  it("expands the comments", async () => {
    const user = userEvent.setup();
    renderScreen();
    const comments = await screen.findByRole("region", {
      name: strings.comments.heading,
    });

    expect(within(comments).getAllByRole("listitem")).toHaveLength(3);

    await user.click(
      within(comments).getByRole("button", {
        name: `${strings.comments.showMore} (3)`,
      }),
    );

    expect(within(comments).getAllByRole("listitem")).toHaveLength(6);
  });

  it("renders the decision buttons as disabled for now", async () => {
    renderScreen();
    const bar = await screen.findByRole("region", {
      name: strings.decision.label,
    });

    [
      strings.decision.decline,
      strings.decision.requestChanges,
      strings.decision.approve,
    ].forEach((name) => {
      expect(within(bar).getByRole("button", { name })).toBeDisabled();
    });
  });

  it("shows not found for an unknown post", async () => {
    renderScreen("missing");

    expect(await screen.findByText(strings.notFound)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: strings.back })).toHaveAttribute(
      "href",
      "/posts?tab=pending&page=2",
    );
  });
});
