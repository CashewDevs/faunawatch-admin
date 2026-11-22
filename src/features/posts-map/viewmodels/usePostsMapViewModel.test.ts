import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAllPosts,
  fetchPostCoverUrls,
} from "../../post-review/services/postsService";
import { testPosts, toTestCoverUrls } from "../../../test/fixtures/posts";
import { createRouterQueryWrapper } from "../../../test/routerWrapper";
import { usePostsMapViewModel } from "./usePostsMapViewModel";

const flag = vi.hoisted(() => ({ requestChanges: false }));

vi.mock("../../../core/constants/featureFlags", () => ({
  isRequestChangesEnabled: () => flag.requestChanges,
}));

vi.mock("../../post-review/services/postsService", () => ({
  fetchAllPosts: vi.fn(),
  fetchPostCoverUrls: vi.fn(),
}));

const fetchAllPostsMock = vi.mocked(fetchAllPosts);
const fetchPostCoverUrlsMock = vi.mocked(fetchPostCoverUrls);

const firstPost = testPosts[0];
const approvedPost = testPosts.find((post) => post.status === "approved");
if (!firstPost || !approvedPost) throw new Error("Test posts are missing");

async function renderLoaded(
  initialEntry = "/map",
  token: string | null = "pk.token",
) {
  const rendered = renderHook(() => usePostsMapViewModel(token), {
    wrapper: createRouterQueryWrapper(initialEntry),
  });
  await waitFor(() => {
    expect(rendered.result.current.isLoading).toBe(false);
  });
  return rendered;
}

describe("usePostsMapViewModel", () => {
  beforeEach(() => {
    flag.requestChanges = false;
    fetchAllPostsMock.mockReset();
    fetchAllPostsMock.mockResolvedValue([...testPosts]);
    fetchPostCoverUrlsMock.mockReset();
    fetchPostCoverUrlsMock.mockImplementation((posts) =>
      Promise.resolve(toTestCoverUrls(posts)),
    );
  });

  it("shows a pin for every post, in 3D, with counts per status", async () => {
    const { result } = await renderLoaded();

    expect(result.current.pins).toHaveLength(30);
    expect(result.current.viewMode).toBe("3d");
    expect(result.current.statusFilters).toEqual([
      { status: "pending", label: "Pending", count: 18, isShown: true },
      { status: "approved", label: "Approved", count: 7, isShown: true },
      { status: "declined", label: "Declined", count: 5, isShown: true },
    ]);
    expect(result.current.pins[0]).toMatchObject({
      id: firstPost.id,
      status: "pending",
      label: "Philippine Tarsier, Pending Review",
    });
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.isFilteredEmpty).toBe(false);
  });

  it("adds a Changes requested chip when Request changes is on", async () => {
    flag.requestChanges = true;
    const { result } = await renderLoaded();
    expect(result.current.statusFilters.map((filter) => filter.status)).toEqual(
      ["pending", "changes_requested", "approved", "declined"],
    );
  });

  it("switches statuses off and back on", async () => {
    const { result } = await renderLoaded();

    act(() => {
      result.current.toggleStatus("pending");
    });
    act(() => {
      result.current.toggleStatus("declined");
    });
    expect(result.current.pins).toHaveLength(7);
    expect(
      result.current.statusFilters.map((filter) => filter.isShown),
    ).toEqual([false, true, false]);

    act(() => {
      result.current.toggleStatus("approved");
    });
    expect(result.current.pins).toHaveLength(0);
    expect(result.current.isFilteredEmpty).toBe(true);

    act(() => {
      result.current.showAllStatuses();
    });
    expect(result.current.pins).toHaveLength(30);
  });

  it("puts each post's first photo in its pin, signed once", async () => {
    const { result } = await renderLoaded();
    const coverUrl = toTestCoverUrls([firstPost]).get(firstPost.id);
    await waitFor(() => {
      expect(result.current.pins[0]?.photoUrl).toBe(coverUrl);
    });
    expect(fetchPostCoverUrlsMock).toHaveBeenCalledTimes(1);
    expect(fetchPostCoverUrlsMock).toHaveBeenCalledWith(testPosts);

    // Filtering doesn't sign the photos again.
    act(() => {
      result.current.toggleStatus("pending");
    });
    expect(result.current.pins[0]?.photoUrl).toBeTruthy();
    expect(fetchPostCoverUrlsMock).toHaveBeenCalledTimes(1);
  });

  it("shows the logo on pins whose photo can't be signed", async () => {
    fetchPostCoverUrlsMock.mockResolvedValue(new Map());
    const { result } = await renderLoaded();
    await waitFor(() => {
      expect(fetchPostCoverUrlsMock).toHaveBeenCalled();
    });
    expect(result.current.pins.every((pin) => pin.photoUrl === null)).toBe(
      true,
    );
  });

  it("opens a pin's card with its photo, and closes it", async () => {
    const { result } = await renderLoaded();

    act(() => {
      result.current.selectPost(firstPost.id);
    });
    expect(result.current.selectedPost?.id).toBe(firstPost.id);
    // The card reuses the pin's photo.
    await waitFor(() => {
      expect(result.current.selectedCoverUrl).toBe(
        toTestCoverUrls([firstPost]).get(firstPost.id),
      );
    });
    expect(result.current.isSelectedCoverLoading).toBe(false);
    // Back from the post returns to this map with the card open.
    expect(result.current.detailLinkState).toEqual({
      from: `/map?post=${firstPost.id}`,
    });

    act(() => {
      result.current.closeCard();
    });
    expect(result.current.selectedPost).toBeNull();
  });

  it("closes the card when its status is switched off", async () => {
    const { result } = await renderLoaded(`/map?post=${approvedPost.id}`);
    expect(result.current.selectedPost?.id).toBe(approvedPost.id);

    act(() => {
      result.current.toggleStatus("approved");
    });
    expect(result.current.selectedPost).toBeNull();

    // Switching it back on doesn't reopen it.
    act(() => {
      result.current.toggleStatus("approved");
    });
    expect(result.current.selectedPost).toBeNull();
  });

  it("restores filters, view and card from the address", async () => {
    const { result } = await renderLoaded(
      `/map?hide=pending&view=2d&post=${approvedPost.id}`,
    );
    expect(result.current.viewMode).toBe("2d");
    expect(result.current.pins).toHaveLength(12);
    expect(result.current.selectedPost?.id).toBe(approvedPost.id);
  });

  it("ignores a card for a post that's filtered out or gone", async () => {
    const { result } = await renderLoaded(
      `/map?hide=approved&post=${approvedPost.id}`,
    );
    expect(result.current.selectedPost).toBeNull();

    const { result: missing } = await renderLoaded("/map?post=missing");
    expect(missing.current.selectedPost).toBeNull();
  });

  it("switches between 3D and 2D", async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.setViewMode("2d");
    });
    expect(result.current.viewMode).toBe("2d");
    act(() => {
      result.current.setViewMode("3d");
    });
    expect(result.current.viewMode).toBe("3d");
  });

  it("asks the map to fit every pin", async () => {
    const { result } = await renderLoaded();
    expect(result.current.fitAllRequest).toBe(0);
    act(() => {
      result.current.fitAllPins();
    });
    expect(result.current.fitAllRequest).toBe(1);
  });

  it("reports when there are no posts at all", async () => {
    fetchAllPostsMock.mockResolvedValue([]);
    const { result } = await renderLoaded();
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.isFilteredEmpty).toBe(false);
  });

  it("reports a load error and retries", async () => {
    fetchAllPostsMock.mockRejectedValueOnce(new Error("offline"));
    const { result } = await renderLoaded();
    expect(result.current.isError).toBe(true);

    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(result.current.pins).toHaveLength(30);
    });
  });

  it("hides the map without a token or after it fails", async () => {
    const { result: noToken } = await renderLoaded("/map", null);
    expect(noToken.current.mapToken).toBeNull();

    const { result } = await renderLoaded();
    expect(result.current.mapToken).toBe("pk.token");
    act(() => {
      result.current.reportMapFailed();
    });
    expect(result.current.mapToken).toBeNull();
  });
});
