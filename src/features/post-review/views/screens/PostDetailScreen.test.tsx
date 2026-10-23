import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../../../core/constants/appRoutes";
import { AppStrings } from "../../../../core/constants/appStrings";
import { getQueuePosition } from "../../models/post";
import { mockPostDetails, mockPosts } from "../../services/mockPosts";
import { fetchPost, fetchPostQueuePosition } from "../../services/postsService";
import { createRouterQueryWrapper } from "../../../../test/routerWrapper";
import { PostDetailScreen } from "./PostDetailScreen";

vi.mock("../../services/postsService", () => ({
  fetchPost: vi.fn(),
  fetchPostQueuePosition: vi.fn(),
}));

const strings = AppStrings.posts.detail;

/** The tarsier post from the Figma frame: 4 photos and 6 comments. */
const tarsier = mockPostDetails.find(
  (post) => post.photoUrls.length === 4 && post.comments.length === 6,
);
if (!tarsier) throw new Error("Mock tarsier post is missing");

function renderScreen(postId = tarsier?.id ?? "") {
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
      Promise.resolve(mockPostDetails.find((post) => post.id === id) ?? null),
    );
    vi.mocked(fetchPostQueuePosition).mockImplementation((id) =>
      Promise.resolve(getQueuePosition(mockPosts, id)),
    );
  });

  it("renders the post, reporter, and AI analysis", async () => {
    renderScreen();

    expect(
      await screen.findByRole("heading", { level: 2, name: tarsier.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${strings.postPrefix}${String(tarsier.reference)}`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: strings.ai.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: tarsier.aiMatch.commonName }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: strings.ai.matchConfidence }),
    ).toHaveAttribute("value", String(tarsier.aiMatch.confidencePercent));
    expect(screen.getByText(/92\.9% Approval Rate/)).toBeInTheDocument();
  });

  it("links back to the list it came from", async () => {
    renderScreen();
    await screen.findByRole("heading", { level: 2, name: tarsier.title });

    expect(screen.getByRole("link", { name: strings.back })).toHaveAttribute(
      "href",
      "/posts?tab=pending&page=2",
    );
  });

  it("switches photos from the thumbnails", async () => {
    const user = userEvent.setup();
    renderScreen();
    const gallery = await screen.findByRole("region", {
      name: strings.gallery.label,
    });

    await user.click(
      within(gallery).getByRole("button", {
        name: `${strings.gallery.photo} 3`,
      }),
    );

    expect(
      within(gallery).getByRole("button", {
        name: `${strings.gallery.photo} 3`,
      }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      within(gallery).getByRole("img", { name: /Photo 3 \/ 4/ }),
    ).toHaveAttribute("src", tarsier.photoUrls[2]);
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
