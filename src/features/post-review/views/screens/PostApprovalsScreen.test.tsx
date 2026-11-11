import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation, useParams } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../../../core/constants/appRoutes";
import { AppStrings } from "../../../../core/constants/appStrings";
import { formatCoordinates } from "../../../../core/utils/formatters";
import { countPostsByTab, sortPosts } from "../../models/post";
import { ModerationError } from "../../models/moderation";
import { decidePosts } from "../../services/moderationService";
import { fetchAllPosts, fetchPostCardMedia } from "../../services/postsService";
import { testPosts, toTestCardData } from "../../../../test/fixtures/posts";
import { createRouterQueryWrapper } from "../../../../test/routerWrapper";
import { getReturnPath } from "../../viewmodels/postNavigation";
import { PostApprovalsScreen } from "./PostApprovalsScreen";

vi.mock("../../services/postsService", () => ({
  fetchAllPosts: vi.fn(),
  fetchPostCardMedia: vi.fn(),
}));

vi.mock("../../services/moderationService", () => ({
  decidePosts: vi.fn(),
}));

const strings = AppStrings.posts;
const counts = countPostsByTab(testPosts);
const decidePostsMock = vi.mocked(decidePosts);
/** The pending tab, newest first, as the screen shows it. */
const pendingPosts = sortPosts(
  testPosts.filter((post) => post.status === "pending"),
  "newest",
);

function DetailProbe() {
  const { postId } = useParams();
  const location = useLocation();
  return (
    <p>
      Opened {postId} from {getReturnPath(location.state)}
    </p>
  );
}

function renderScreen(initialEntry = "/posts") {
  return render(
    <Routes>
      <Route path={AppRoutes.posts} element={<PostApprovalsScreen />} />
      <Route path={AppRoutes.postDetail} element={<DetailProbe />} />
    </Routes>,
    { wrapper: createRouterQueryWrapper(initialEntry) },
  );
}

async function findCards() {
  const grid = await screen.findByRole("list", { name: strings.gridLabel });
  return within(grid).getAllByRole("article");
}

describe("PostApprovalsScreen", () => {
  beforeEach(() => {
    vi.mocked(fetchAllPosts).mockReset();
    vi.mocked(fetchAllPosts).mockResolvedValue([...testPosts]);
    vi.mocked(fetchPostCardMedia).mockImplementation((posts) =>
      Promise.resolve(posts.map(toTestCardData)),
    );
    decidePostsMock.mockReset();
    decidePostsMock.mockResolvedValue(undefined);
  });

  it("renders the tab counts and a page of pending posts", async () => {
    renderScreen();

    expect(await findCards()).toHaveLength(12);
    expect(
      await screen.findByRole("button", {
        name: `${strings.tabs.pending} ${String(counts.pending)}`,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/^Showing/)).toHaveTextContent(
      `Showing 1-12 of ${String(counts.pending)} posts`,
    );
  });

  it("titles cards by category and shows the AI match only when rated", async () => {
    renderScreen("/posts?tab=all");
    const [newest] = sortPosts(testPosts, "newest");
    if (!newest?.aiMatch) throw new Error("Newest post needs an AI match");
    const unrated = testPosts.find((post) => post.aiMatch === null);
    if (!unrated) throw new Error("No unrated post");

    const [firstCard] = await findCards();
    if (!firstCard) throw new Error("No cards rendered");
    expect(
      within(firstCard).getByRole("link", {
        name: strings.category[newest.category],
      }),
    ).toBeInTheDocument();
    expect(firstCard).toHaveTextContent(
      formatCoordinates(newest.latitude, newest.longitude),
    );
    expect(firstCard).toHaveTextContent(
      `${strings.card.aiPrefix} ${newest.aiMatch.commonName}, ${strings.confidence[newest.aiMatch.confidence]}`,
    );
    expect(firstCard).toHaveTextContent(`@${newest.reporter.username ?? ""}`);

    const unratedCard = (await findCards()).find((card) =>
      within(card).queryByText(unrated.description),
    );
    if (!unratedCard) throw new Error("Unrated card not on the first page");
    expect(unratedCard).not.toHaveTextContent(strings.card.aiPrefix);
    expect(unratedCard).toHaveTextContent(
      `${strings.severity.unrated} ${strings.severitySuffix}`,
    );
  });

  it("shows a card's place name instead of its coordinates", async () => {
    const [first, ...others] = testPosts;
    if (!first) throw new Error("fixture missing");
    vi.mocked(fetchAllPosts).mockResolvedValue([
      { ...first, placeName: "Lusod, Kabayan, Benguet" },
      ...others,
    ]);
    renderScreen();

    const [firstCard] = await findCards();
    if (!firstCard) throw new Error("No cards rendered");
    expect(firstCard).toHaveTextContent("Lusod, Kabayan, Benguet");
    expect(firstCard).not.toHaveTextContent(
      formatCoordinates(first.latitude, first.longitude),
    );
  });

  it("opens a post's review page when its card is clicked", async () => {
    const user = userEvent.setup();
    renderScreen("/posts?sort=oldest");
    const [firstCard] = await findCards();
    if (!firstCard) throw new Error("No cards rendered");

    const link = within(firstCard).getByRole("link");
    const postId = link.getAttribute("href")?.split("/").pop();
    await user.click(link);

    expect(
      await screen.findByText(`Opened ${postId ?? ""} from /posts?sort=oldest`),
    ).toBeInTheDocument();
  });

  it("switches tabs", async () => {
    const user = userEvent.setup();
    renderScreen();
    await findCards();

    await user.click(
      await screen.findByRole("button", {
        name: `${strings.tabs.declined} ${String(counts.declined)}`,
      }),
    );

    const cards = await findCards();
    expect(cards).toHaveLength(counts.declined);
    expect(
      screen.queryByRole("button", { name: strings.card.approve }),
    ).not.toBeInTheDocument();
    cards.forEach((card) => {
      expect(
        within(card).getByText(strings.status.declined),
      ).toBeInTheDocument();
    });
  });

  it("filters by category", async () => {
    const user = userEvent.setup();
    renderScreen();
    await findCards();

    await user.selectOptions(
      screen.getByRole("combobox", { name: strings.filters.categoryLabel }),
      "potentially_dangerous_animal",
    );

    const cards = await findCards();
    cards.forEach((card) => {
      expect(
        within(card).getByRole("link", {
          name: strings.category.potentially_dangerous_animal,
        }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("combobox", { name: /region/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the bulk bar while posts are selected", async () => {
    const user = userEvent.setup();
    renderScreen();
    const [firstCard] = await findCards();
    if (!firstCard) throw new Error("No cards rendered");

    await user.click(within(firstCard).getByRole("checkbox"));

    const bar = screen.getByRole("region", { name: strings.bulk.label });
    expect(bar).toHaveTextContent(`1 ${strings.bulk.selectedOne}`);
    expect(within(bar).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      within(bar).getByRole("button", { name: "Approve 1 selected post" }),
    ).toBeEnabled();
    expect(
      within(bar).getByRole("button", { name: "Decline 1 selected post" }),
    ).toBeEnabled();

    await user.click(
      within(bar).getByRole("button", { name: strings.bulk.selectAll }),
    );
    expect(bar).toHaveTextContent(`12 ${strings.bulk.selectedMany}`);

    await user.click(
      within(bar).getByRole("button", { name: strings.bulk.unselectAll }),
    );
    expect(
      screen.queryByRole("region", { name: strings.bulk.label }),
    ).not.toBeInTheDocument();
    screen
      .getAllByRole("checkbox")
      .forEach((checkbox) => expect(checkbox).not.toBeChecked());
  });

  describe("moderation", () => {
    const moderation = strings.moderation;

    it("approves one post after confirming, then reloads the list", async () => {
      const user = userEvent.setup();
      renderScreen();
      const [firstCard] = await findCards();
      if (!firstCard) throw new Error("No cards rendered");
      const postId = pendingPosts[0]?.id;

      await user.click(
        within(firstCard).getByRole("button", { name: strings.card.approve }),
      );
      const dialog = screen.getByRole("dialog", {
        name: moderation.title.approve,
      });
      expect(dialog).toHaveAccessibleDescription(moderation.body.approve);
      expect(decidePostsMock).not.toHaveBeenCalled();

      await user.click(
        within(dialog).getByRole("button", {
          name: moderation.confirm.approve,
        }),
      );

      expect(decidePostsMock).toHaveBeenCalledWith([postId], "approve", null);
      expect(
        await screen.findByText(moderation.success.approve),
      ).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await waitFor(() => {
        expect(vi.mocked(fetchAllPosts)).toHaveBeenCalledTimes(2);
      });
    });

    it("cancelling changes nothing", async () => {
      const user = userEvent.setup();
      renderScreen();
      const [firstCard] = await findCards();
      if (!firstCard) throw new Error("No cards rendered");

      await user.click(
        within(firstCard).getByRole("button", { name: strings.card.decline }),
      );
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: moderation.cancel,
        }),
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(decidePostsMock).not.toHaveBeenCalled();
    });

    it("declines the selected posts with one reason and clears the selection", async () => {
      const user = userEvent.setup();
      renderScreen();
      const cards = await findCards();
      for (const card of cards.slice(0, 2)) {
        await user.click(within(card).getByRole("checkbox"));
      }

      await user.click(
        screen.getByRole("button", { name: "Decline 2 selected posts" }),
      );
      const dialog = screen.getByRole("dialog", {
        name: `${moderation.titleManyPrefix.decline} 2 ${moderation.titleManySuffix}`,
      });
      expect(dialog).toHaveTextContent(moderation.reasonManyHint);
      const confirm = within(dialog).getByRole("button", {
        name: moderation.confirm.decline,
      });
      expect(confirm).toBeDisabled();

      await user.click(
        within(dialog).getByRole("radio", {
          name: moderation.reasons.notWildlife,
        }),
      );
      await user.click(confirm);

      expect(decidePostsMock).toHaveBeenCalledWith(
        pendingPosts.slice(0, 2).map((post) => post.id),
        "decline",
        "notWildlife",
      );
      expect(
        await screen.findByText(`2 ${moderation.successMany.decline}`),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("region", { name: strings.bulk.label }),
      ).not.toBeInTheDocument();
    });

    it("only offers selection and decisions on pending posts", async () => {
      renderScreen("/posts?tab=declined");
      const cards = await findCards();
      const decided = cards.filter(
        (card) =>
          !within(card).queryByRole("button", { name: strings.card.approve }),
      );
      expect(decided.length).toBeGreaterThan(0);
      decided.forEach((card) => {
        expect(within(card).queryByRole("checkbox")).not.toBeInTheDocument();
        expect(
          within(card).queryByRole("button", { name: strings.card.decline }),
        ).not.toBeInTheDocument();
      });
    });

    it("closes and explains when another admin decided first", async () => {
      decidePostsMock.mockRejectedValueOnce(
        new ModerationError("alreadyDecided"),
      );
      const user = userEvent.setup();
      renderScreen();
      const [firstCard] = await findCards();
      if (!firstCard) throw new Error("No cards rendered");

      await user.click(
        within(firstCard).getByRole("button", { name: strings.card.approve }),
      );
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: moderation.confirm.approve,
        }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        moderation.errors.alreadyDecided,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await waitFor(() => {
        expect(vi.mocked(fetchAllPosts)).toHaveBeenCalledTimes(2);
      });
    });

    it("keeps the dialog open to retry after a network error", async () => {
      decidePostsMock.mockRejectedValueOnce(new Error("network"));
      const user = userEvent.setup();
      renderScreen();
      const [firstCard] = await findCards();
      if (!firstCard) throw new Error("No cards rendered");

      await user.click(
        within(firstCard).getByRole("button", { name: strings.card.approve }),
      );
      const dialog = screen.getByRole("dialog");
      const confirm = within(dialog).getByRole("button", {
        name: moderation.confirm.approve,
      });
      await user.click(confirm);

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        moderation.failed,
      );

      await user.click(confirm);

      expect(
        await screen.findByText(moderation.success.approve),
      ).toBeInTheDocument();
      expect(decidePostsMock).toHaveBeenCalledTimes(2);
    });
  });

  it("shows the empty state when the search matches nothing", async () => {
    const user = userEvent.setup();
    renderScreen();
    await findCards();

    await user.type(
      screen.getByRole("searchbox", { name: strings.searchLabel }),
      "zzz-no-match",
    );

    expect(await screen.findByText(strings.empty)).toBeInTheDocument();
  });

  it("shows the error state with a retry button", async () => {
    vi.mocked(fetchAllPosts).mockRejectedValueOnce(new Error("network"));
    renderScreen();

    expect(await screen.findByRole("alert")).toHaveTextContent(strings.error);
    expect(
      screen.getByRole("button", { name: strings.retry }),
    ).toBeInTheDocument();
  });
});
