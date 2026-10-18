import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation, useParams } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../../../core/constants/appRoutes";
import { AppStrings } from "../../../../core/constants/appStrings";
import { countPostsByTab, queryPosts } from "../../models/post";
import { mockPosts } from "../../services/mockPosts";
import { fetchPostCounts, fetchPosts } from "../../services/postsService";
import { createRouterQueryWrapper } from "../../../../test/routerWrapper";
import { getReturnPath } from "../../viewmodels/postNavigation";
import { PostApprovalsScreen } from "./PostApprovalsScreen";

vi.mock("../../services/postsService", () => ({
  fetchPosts: vi.fn(),
  fetchPostCounts: vi.fn(),
}));

const strings = AppStrings.posts;
const counts = countPostsByTab(mockPosts);

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
    vi.mocked(fetchPosts).mockImplementation((query) =>
      Promise.resolve(queryPosts(mockPosts, query)),
    );
    vi.mocked(fetchPostCounts).mockResolvedValue(counts);
  });

  it("renders the heading, tab counts, and a page of pending posts", async () => {
    renderScreen();

    expect(
      screen.getByRole("heading", { name: strings.heading }),
    ).toBeInTheDocument();
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
    ).toBeDisabled();
    expect(
      within(bar).getByRole("button", { name: "Decline 1 selected post" }),
    ).toBeDisabled();

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

  it("renders moderation buttons as disabled for now", async () => {
    renderScreen();
    await findCards();

    const approveButtons = screen.getAllByRole("button", {
      name: strings.card.approve,
    });
    expect(approveButtons).toHaveLength(12);
    approveButtons.forEach((button) => expect(button).toBeDisabled());
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
    vi.mocked(fetchPosts).mockRejectedValueOnce(new Error("network"));
    renderScreen();

    expect(await screen.findByRole("alert")).toHaveTextContent(strings.error);
    expect(
      screen.getByRole("button", { name: strings.retry }),
    ).toBeInTheDocument();
  });
});
