import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { countPostsByTab, type PostSummary } from "../models/post";
import { fetchAllPosts, fetchPostCardMedia } from "../services/postsService";
import { testPosts, toTestCardData } from "../../../test/fixtures/posts";
import { createRouterQueryWrapper } from "../../../test/routerWrapper";
import { usePostApprovalsViewModel } from "./usePostApprovalsViewModel";

const flag = vi.hoisted(() => ({ requestChanges: false }));

vi.mock("../../../core/constants/featureFlags", () => ({
  isRequestChangesEnabled: () => flag.requestChanges,
}));

vi.mock("../services/postsService", () => ({
  fetchAllPosts: vi.fn(),
  fetchPostCardMedia: vi.fn(),
}));

vi.mock("../services/moderationService", () => ({
  decidePosts: vi.fn(),
}));

const fetchAllPostsMock = vi.mocked(fetchAllPosts);
const fetchPostCardMediaMock = vi.mocked(fetchPostCardMedia);
const counts = countPostsByTab(testPosts);

function renderViewModel(initialEntry = "/posts") {
  return renderHook(() => usePostApprovalsViewModel(), {
    wrapper: createRouterQueryWrapper(initialEntry),
  });
}

async function renderLoaded(initialEntry?: string) {
  const rendered = renderViewModel(initialEntry);
  await waitFor(() => {
    expect(rendered.result.current.isLoading).toBe(false);
  });
  return rendered;
}

describe("usePostApprovalsViewModel", () => {
  beforeEach(() => {
    flag.requestChanges = false;
    fetchAllPostsMock.mockReset();
    fetchAllPostsMock.mockResolvedValue([...testPosts]);
    fetchPostCardMediaMock.mockReset();
    fetchPostCardMediaMock.mockImplementation((posts) =>
      Promise.resolve(posts.map(toTestCardData)),
    );
  });

  it("loads the first page of pending posts and the tab counts", async () => {
    const { result } = renderViewModel();
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tab).toBe("pending");
    expect(result.current.posts).toHaveLength(12);
    expect(result.current.posts.every((p) => p.status === "pending")).toBe(
      true,
    );
    expect(result.current.totalCount).toBe(counts.pending);
    expect(result.current.pageCount).toBe(2);
    expect(result.current.counts).toEqual(counts);
    expect(fetchAllPostsMock).toHaveBeenCalledTimes(1);
  });

  it("signs only the current page's covers", async () => {
    const { result } = await renderLoaded();

    await waitFor(() => {
      expect(result.current.posts[0]?.coverUrl).toMatch(/^https:\/\/signed/);
    });
    expect(fetchPostCardMediaMock).toHaveBeenCalledTimes(1);
    expect(fetchPostCardMediaMock.mock.calls[0]?.[0]).toHaveLength(12);

    act(() => {
      result.current.goToPage(2);
    });
    await waitFor(() => {
      expect(fetchPostCardMediaMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchPostCardMediaMock.mock.calls[1]?.[0]).toHaveLength(
      counts.pending - 12,
    );
    // Paging doesn't reload the list.
    expect(fetchAllPostsMock).toHaveBeenCalledTimes(1);
  });

  it("shows cards without images until they are signed", async () => {
    fetchPostCardMediaMock.mockReturnValue(new Promise(() => undefined));
    const { result } = await renderLoaded();

    expect(result.current.posts).toHaveLength(12);
    expect(result.current.posts[0]?.coverUrl).toBeNull();
    expect(result.current.posts[0]?.reporterAvatar).toBeNull();
  });

  it("reads the tab, filters, and page from the URL", async () => {
    const { result } = await renderLoaded(
      "/posts?tab=all&severity=unrated&category=animal_in_need",
    );

    expect(result.current.tab).toBe("all");
    expect(result.current.severity).toBe("unrated");
    expect(result.current.category).toBe("animal_in_need");
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.posts.length).toBeGreaterThan(0);
    expect(
      result.current.posts.every(
        (p) => p.severity === "unrated" && p.category === "animal_in_need",
      ),
    ).toBe(true);
  });

  it("changing tab returns to page 1 and clears the selection", async () => {
    const { result } = await renderLoaded("/posts?page=2");
    expect(result.current.page).toBe(2);

    act(() => {
      result.current.toggleSelection(result.current.posts[0]?.id ?? "");
    });
    expect(result.current.selectedCount).toBe(1);

    act(() => {
      result.current.changeTab("declined");
    });

    expect(result.current.tab).toBe("declined");
    expect(result.current.page).toBe(1);
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.totalCount).toBe(counts.declined);
  });

  it("filters by category, then clears filters", async () => {
    const { result } = await renderLoaded();

    act(() => {
      result.current.changeCategory("possible_invasive_species");
    });

    expect(
      result.current.posts.every(
        (p) => p.category === "possible_invasive_species",
      ),
    ).toBe(true);
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.category).toBe("all");
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it("debounces search before filtering", async () => {
    const { result } = await renderLoaded();

    act(() => {
      result.current.changeSearch("eagle");
    });
    expect(result.current.searchInput).toBe("eagle");
    expect(result.current.totalCount).toBe(counts.pending);

    await waitFor(() => {
      expect(result.current.totalCount).toBeLessThan(counts.pending);
    });
    expect(
      result.current.posts.every(
        (p) => p.aiMatch?.commonName === "Philippine Eagle",
      ),
    ).toBe(true);
  });

  it("keeps page navigation within bounds", async () => {
    const { result } = await renderLoaded();

    act(() => {
      result.current.goToPage(99);
    });
    expect(result.current.page).toBe(2);

    act(() => {
      result.current.goToPage(0);
    });
    expect(result.current.page).toBe(1);
  });

  it("selects single posts, then all on the page, then none", async () => {
    const { result } = await renderLoaded();
    const firstId = result.current.posts[0]?.id ?? "";

    act(() => {
      result.current.toggleSelection(firstId);
    });
    expect(result.current.selectedIds.has(firstId)).toBe(true);

    act(() => {
      result.current.toggleSelection(firstId);
    });
    expect(result.current.selectedCount).toBe(0);

    act(() => {
      result.current.toggleSelection(firstId);
    });
    act(() => {
      result.current.toggleSelectAll();
    });
    expect(result.current.selectedCount).toBe(12);
    expect(result.current.allOnPageSelected).toBe(true);

    act(() => {
      result.current.toggleSelectAll();
    });
    expect(result.current.selectedCount).toBe(0);
  });

  it("drops a selected post once it is no longer pending", async () => {
    const { result } = await renderLoaded();
    const [first, second] = result.current.posts;
    if (!first || !second) throw new Error("Need two pending posts");

    act(() => {
      result.current.toggleSelection(first.id);
    });
    act(() => {
      result.current.toggleSelection(second.id);
    });
    expect(result.current.selectedCount).toBe(2);

    // Another admin approves the first post; the list reloads.
    fetchAllPostsMock.mockResolvedValue(
      testPosts.map((post) =>
        post.id === first.id ? { ...post, status: "approved" } : post,
      ),
    );
    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.selectedCount).toBe(1);
    });
    expect([...result.current.selectedIds]).toEqual([second.id]);
  });

  it("ignores selecting a post that isn't pending", async () => {
    const { result } = await renderLoaded("/posts?tab=approved");
    const decided = result.current.posts.find(
      (post) => post.status !== "pending",
    );
    if (!decided) throw new Error("Need a decided post on the first page");

    act(() => {
      result.current.toggleSelection(decided.id);
    });

    expect(result.current.selectedCount).toBe(0);
  });

  describe("Changes requested", () => {
    const base = testPosts[0] as PostSummary;
    const sentBack: PostSummary = {
      ...base,
      id: "sent-back",
      status: "changes_requested",
    };
    const unknownStatus: PostSummary = {
      ...base,
      id: "unknown-status",
      status: "unknown",
    };

    beforeEach(() => {
      fetchAllPostsMock.mockResolvedValue([
        sentBack,
        unknownStatus,
        ...testPosts,
      ]);
    });

    it("hides the tab but still counts the posts while off", async () => {
      const { result } = await renderLoaded();

      expect(result.current.tabs).toEqual([
        "pending",
        "approved",
        "declined",
        "all",
      ]);
      expect(result.current.counts?.changes_requested).toBe(1);
      expect(result.current.counts?.all).toBe(testPosts.length + 2);
    });

    it("offers the tab with its count while on", async () => {
      flag.requestChanges = true;
      const { result } = await renderLoaded("/posts?tab=changes_requested");

      expect(result.current.tabs).toContain("changes_requested");
      expect(result.current.tab).toBe("changes_requested");
      expect(result.current.posts.map((post) => post.id)).toEqual([
        "sent-back",
      ]);
      expect(result.current.counts?.changes_requested).toBe(1);
    });

    it("ignores ?tab=changes_requested while off", async () => {
      const { result } = await renderLoaded("/posts?tab=changes_requested");

      expect(result.current.tab).toBe("pending");
    });

    it("lists a post with an unknown status only under All Posts", async () => {
      const pending = await renderLoaded();
      expect(
        pending.result.current.posts.some(
          (post) => post.id === unknownStatus.id,
        ),
      ).toBe(false);
      expect(pending.result.current.counts?.pending).toBe(counts.pending);

      const all = await renderLoaded("/posts?tab=all&size=48");
      expect(
        all.result.current.posts.some((post) => post.id === unknownStatus.id),
      ).toBe(true);
    });

    it("can't select a sent-back or unknown-status post", async () => {
      const { result } = await renderLoaded("/posts?tab=all&size=48");

      act(() => {
        result.current.toggleSelection(sentBack.id);
        result.current.toggleSelection(unknownStatus.id);
      });

      expect(result.current.selectedCount).toBe(0);
    });
  });

  it("exposes the error state and retries", async () => {
    fetchAllPostsMock.mockRejectedValueOnce(new Error("network"));
    const { result } = renderViewModel();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(false);
    });
    expect(result.current.posts).toHaveLength(12);
  });
});
