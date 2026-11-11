import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchIsUserVerified } from "../../users/services/usersService";
import { getQueuePosition } from "../models/post";
import { addAdminNote, fetchAdminNotes } from "../services/adminNotesService";
import { fetchAllPosts, fetchPost } from "../services/postsService";
import { testPosts, testTarsier } from "../../../test/fixtures/posts";
import { testUsers } from "../../../test/fixtures/users";
import { createRouterQueryWrapper } from "../../../test/routerWrapper";
import { usePostDetailViewModel } from "./usePostDetailViewModel";

vi.mock("../services/postsService", () => ({
  fetchPost: vi.fn(),
  fetchAllPosts: vi.fn(),
}));

vi.mock("../services/adminNotesService", () => ({
  fetchAdminNotes: vi.fn(),
  addAdminNote: vi.fn(),
}));

vi.mock("../services/moderationService", () => ({
  decidePosts: vi.fn(),
}));

vi.mock("../../users/services/usersService", () => ({
  fetchIsUserVerified: vi.fn(),
  fetchUserCounts: vi.fn(),
}));

function renderViewModel(
  postId = testTarsier.id,
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
      Promise.resolve(id === testTarsier.id ? testTarsier : null),
    );
    vi.mocked(fetchAllPosts).mockResolvedValue([...testPosts]);
    vi.mocked(fetchAdminNotes).mockResolvedValue([]);
    vi.mocked(addAdminNote).mockReset();
    vi.mocked(addAdminNote).mockResolvedValue(undefined);
    vi.mocked(fetchIsUserVerified).mockImplementation((id) =>
      Promise.resolve(
        testUsers.find((user) => user.id === id)?.isVerified ?? false,
      ),
    );
  });

  it("loads the post, its queue position, and the return path", async () => {
    const { result } = await renderLoaded();

    expect(result.current.post?.id).toBe(testTarsier.id);
    expect(result.current.isNotFound).toBe(false);
    expect(result.current.returnPath).toBe("/posts?tab=pending&page=2");
    expect(result.current.approvalRate).toBe(92.9);
    await waitFor(() => {
      expect(result.current.queue).toEqual(
        getQueuePosition(testPosts, testTarsier.id),
      );
    });
  });

  it("loads the verified flag of the reporter", async () => {
    const verified = testUsers.find((user) => user.isVerified);
    if (!verified) throw new Error("No verified test user");
    vi.mocked(fetchPost).mockResolvedValue({
      ...testTarsier,
      reporter: { ...testTarsier.reporter, id: verified.id },
    });

    const { result } = await renderLoaded();

    await waitFor(() => {
      expect(result.current.isReporterVerified).toBe(true);
    });
    expect(vi.mocked(fetchIsUserVerified)).toHaveBeenCalledWith(verified.id);
  });

  it("treats an unverified or unknown reporter as unverified", async () => {
    const { result } = await renderLoaded();
    await waitFor(() => {
      expect(vi.mocked(fetchIsUserVerified)).toHaveBeenCalled();
    });
    expect(result.current.isReporterVerified).toBe(false);
  });

  it("falls back to the plain list without router state", async () => {
    const { result } = await renderLoaded(testTarsier.id, null);
    expect(result.current.returnPath).toBe("/posts");
  });

  it("reports a missing post as not found", async () => {
    const { result } = await renderLoaded("missing");
    expect(result.current.isNotFound).toBe(true);
    expect(result.current.post).toBeUndefined();
  });

  it("steps through photos with each photo's EXIF, wrapping around", async () => {
    const { result } = await renderLoaded();

    expect(result.current.photoCount).toBe(4);
    expect(result.current.currentPhotoUrl).toBe(testTarsier.photos[0]?.url);
    expect(result.current.currentPhotoExif?.flashFired).toBe(false);

    act(() => {
      result.current.showPreviousPhoto();
    });
    expect(result.current.photoIndex).toBe(3);

    act(() => {
      result.current.showNextPhoto();
    });
    expect(result.current.photoIndex).toBe(0);

    act(() => {
      result.current.showPhoto(1);
    });
    expect(result.current.currentPhotoUrl).toBe(testTarsier.photos[1]?.url);
    expect(result.current.currentPhotoExif?.flashFired).toBe(true);
  });

  it("derives the observer device and checklist labels", async () => {
    const { result } = await renderLoaded();

    expect(result.current.observerDevice).toBe("Canon EOS R5");
    expect(result.current.aiChecklist).toEqual([
      {
        key: "image_relevant",
        passed: true,
        label: "Photo matches the report",
      },
      { key: "blur_check", passed: false, label: "Blur check" },
    ]);
  });

  it("has no checklist without an AI analysis", async () => {
    vi.mocked(fetchPost).mockResolvedValue({ ...testTarsier, ai: null });
    const { result } = await renderLoaded();
    expect(result.current.aiChecklist).toEqual([]);
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
    expect(result.current.canSaveNote).toBe(true);
  });

  it("can't save a blank note and shows the length only near the limit", async () => {
    const { result } = await renderLoaded();

    act(() => {
      result.current.changeAdminNote("   ");
    });
    expect(result.current.canSaveNote).toBe(false);
    expect(result.current.adminNoteLengthLabel).toBeNull();

    act(() => {
      result.current.changeAdminNote("a".repeat(1900));
    });
    expect(result.current.adminNoteLengthLabel).toBe("1,900 / 2,000");
  });

  it("keeps text typed while a save was in flight", async () => {
    let finish: () => void = () => undefined;
    vi.mocked(addAdminNote).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = await renderLoaded();

    act(() => {
      result.current.changeAdminNote("First");
    });
    act(() => {
      result.current.saveNote();
    });
    await waitFor(() => {
      expect(addAdminNote).toHaveBeenCalledWith(testTarsier.id, "First");
    });
    act(() => {
      result.current.changeAdminNote("First and more");
    });
    act(() => {
      finish();
    });

    await waitFor(() => {
      expect(result.current.isSavingNote).toBe(false);
    });
    expect(result.current.adminNote).toBe("First and more");
  });
});
