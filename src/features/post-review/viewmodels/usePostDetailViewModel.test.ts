import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getQueuePosition } from "../models/post";
import { mockPostDetails, mockPosts } from "../services/mockPosts";
import { fetchPost, fetchPostQueuePosition } from "../services/postsService";
import { createRouterQueryWrapper } from "../../../test/routerWrapper";
import { usePostDetailViewModel } from "./usePostDetailViewModel";

vi.mock("../services/postsService", () => ({
  fetchPost: vi.fn(),
  fetchPostQueuePosition: vi.fn(),
}));

/** The tarsier post from the Figma frame: 4 photos and 6 comments. */
const tarsier = mockPostDetails.find(
  (post) => post.photoUrls.length === 4 && post.comments.length === 6,
);
if (!tarsier) throw new Error("Mock tarsier post is missing");

function renderViewModel(
  postId = tarsier?.id ?? "",
  state: unknown = { from: "/posts?tab=pending&page=2" },
) {
  return renderHook(() => usePostDetailViewModel(postId), {
    wrapper: createRouterQueryWrapper({ pathname: `/posts/${postId}`, state }),
  });
}

async function renderLoaded(...args: Parameters<typeof renderViewModel>) {
  const rendered = renderViewModel(...args);
  await waitFor(() => {
    expect(rendered.result.current.isLoading).toBe(false);
  });
  return rendered;
}

describe("usePostDetailViewModel", () => {
  beforeEach(() => {
    vi.mocked(fetchPost).mockImplementation((id) =>
      Promise.resolve(mockPostDetails.find((post) => post.id === id) ?? null),
    );
    vi.mocked(fetchPostQueuePosition).mockImplementation((id) =>
      Promise.resolve(getQueuePosition(mockPosts, id)),
    );
  });

  it("loads the post, its queue position, and the return path", async () => {
    const { result } = await renderLoaded();

    expect(result.current.post?.id).toBe(tarsier.id);
    expect(result.current.isNotFound).toBe(false);
    expect(result.current.returnPath).toBe("/posts?tab=pending&page=2");
    expect(result.current.approvalRate).toBe(92.9);
    await waitFor(() => {
      expect(result.current.queue).toEqual(
        getQueuePosition(mockPosts, tarsier.id),
      );
    });
  });

  it("falls back to the plain list without router state", async () => {
    const { result } = await renderLoaded(tarsier.id, null);
    expect(result.current.returnPath).toBe("/posts");
  });

  it("reports a missing post as not found", async () => {
    const { result } = await renderLoaded("missing");
    expect(result.current.isNotFound).toBe(true);
    expect(result.current.post).toBeUndefined();
  });

  it("steps through photos and wraps around", async () => {
    const { result } = await renderLoaded();
    expect(result.current.photoCount).toBe(4);
    expect(result.current.currentPhotoUrl).toBe(tarsier.photoUrls[0]);

    act(() => {
      result.current.showPreviousPhoto();
    });
    expect(result.current.photoIndex).toBe(3);
    act(() => {
      result.current.showNextPhoto();
    });
    expect(result.current.photoIndex).toBe(0);
    act(() => {
      result.current.showPhoto(2);
    });
    expect(result.current.currentPhotoUrl).toBe(tarsier.photoUrls[2]);
  });

  it("shows three comments until expanded, newest first by default", async () => {
    const { result } = await renderLoaded();

    expect(result.current.comments).toHaveLength(3);
    expect(result.current.commentCount).toBe(6);
    expect(result.current.hiddenCommentCount).toBe(3);
    expect(result.current.comments[0]?.authorName).toBe("Dr. Aris Thorne");

    act(() => {
      result.current.toggleComments();
    });
    expect(result.current.comments).toHaveLength(6);
    expect(result.current.hiddenCommentCount).toBe(0);

    act(() => {
      result.current.changeCommentSort("oldest");
    });
    expect(result.current.comments[5]?.authorName).toBe("Dr. Aris Thorne");
  });

  it("copies the coordinates and confirms", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const { result } = await renderLoaded();

    act(() => {
      result.current.copyCoordinates();
    });
    await waitFor(() => {
      expect(result.current.isCopied).toBe(true);
    });
    expect(writeText).toHaveBeenCalledWith(result.current.coordinatesLabel);
  });

  it("keeps the admin note draft", async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.changeAdminNote("Blur coordinates before publishing.");
    });
    expect(result.current.adminNote).toBe(
      "Blur coordinates before publishing.",
    );
  });
});
