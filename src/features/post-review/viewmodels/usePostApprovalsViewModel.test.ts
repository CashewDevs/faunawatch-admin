import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { countPostsByTab, queryPosts } from "../models/post";
import { mockPosts } from "../services/mockPosts";
import { fetchPostCounts, fetchPosts } from "../services/postsService";
import { createRouterQueryWrapper } from "../../../test/routerWrapper";
import { usePostApprovalsViewModel } from "./usePostApprovalsViewModel";

vi.mock("../services/postsService", () => ({
  fetchPosts: vi.fn(),
  fetchPostCounts: vi.fn(),
}));

const fetchPostsMock = vi.mocked(fetchPosts);
const counts = countPostsByTab(mockPosts);

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
    fetchPostsMock.mockReset();
    fetchPostsMock.mockImplementation((query) =>
      Promise.resolve(queryPosts(mockPosts, query)),
    );
    vi.mocked(fetchPostCounts).mockResolvedValue(counts);
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

    await waitFor(() => {
      expect(result.current.counts).toEqual(counts);
    });
  });

  it("reads the tab, filters, and page from the URL", async () => {
    const { result } = await renderLoaded("/posts?tab=approved&severity=high");

    expect(result.current.tab).toBe("approved");
    expect(result.current.severity).toBe("high");
    expect(result.current.hasActiveFilters).toBe(true);
    expect(
      result.current.posts.every(
        (p) => p.status === "approved" && p.severity === "high",
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
    await waitFor(() => {
      expect(result.current.totalCount).toBe(counts.declined);
    });
  });

  it("filters, then clears filters", async () => {
    const { result } = await renderLoaded();

    act(() => {
      result.current.changeCategory("bird");
    });
    await waitFor(() => {
      expect(result.current.posts.every((p) => p.category === "bird")).toBe(
        true,
      );
    });
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.clearFilters();
    });
    expect(result.current.category).toBe("all");
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it("debounces search before querying", async () => {
    const { result } = await renderLoaded();

    act(() => {
      result.current.changeSearch("tarsier");
    });
    expect(result.current.searchInput).toBe("tarsier");

    await waitFor(() => {
      expect(fetchPostsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "tarsier", page: 1 }),
      );
    });
    await waitFor(() => {
      expect(
        result.current.posts.every((p) =>
          p.aiMatch.commonName.includes("Tarsier"),
        ),
      ).toBe(true);
    });
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

  it("exposes the error state and retries", async () => {
    fetchPostsMock.mockRejectedValueOnce(new Error("network"));
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
