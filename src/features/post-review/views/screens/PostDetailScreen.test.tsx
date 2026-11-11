import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../../../core/constants/appRoutes";
import { AppStrings } from "../../../../core/constants/appStrings";
import { fetchIsUserVerified } from "../../../users/services/usersService";
import type { AdminNote } from "../../models/adminNote";
import {
  addAdminNote,
  fetchAdminNotes,
} from "../../services/adminNotesService";
import { decidePosts } from "../../services/moderationService";
import { fetchAllPosts, fetchPost } from "../../services/postsService";
import { testPosts, testTarsier } from "../../../../test/fixtures/posts";
import { createRouterQueryWrapper } from "../../../../test/routerWrapper";
import { PostDetailScreen } from "./PostDetailScreen";

vi.mock("../../services/postsService", () => ({
  fetchPost: vi.fn(),
  fetchAllPosts: vi.fn(),
}));

vi.mock("../../../users/services/usersService", () => ({
  fetchIsUserVerified: vi.fn(),
  fetchUserCounts: vi.fn(),
}));

vi.mock("../../services/moderationService", () => ({
  decidePosts: vi.fn(),
}));

vi.mock("../../services/adminNotesService", () => ({
  fetchAdminNotes: vi.fn(),
  addAdminNote: vi.fn(),
}));

const decidePostsMock = vi.mocked(decidePosts);
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
    decidePostsMock.mockReset();
    decidePostsMock.mockResolvedValue(undefined);
    vi.mocked(fetchPost).mockReset();
    vi.mocked(fetchPost).mockImplementation((id) =>
      Promise.resolve(id === testTarsier.id ? testTarsier : null),
    );
    vi.mocked(fetchAllPosts).mockResolvedValue([...testPosts]);
    vi.mocked(fetchIsUserVerified).mockResolvedValue(false);
    vi.mocked(fetchAdminNotes).mockReset();
    vi.mocked(fetchAdminNotes).mockResolvedValue([]);
    vi.mocked(addAdminNote).mockReset();
    vi.mocked(addAdminNote).mockResolvedValue(undefined);
  });

  describe("admin notes", () => {
    const notes = strings.notes;
    const earlier: AdminNote[] = [
      {
        id: "n2",
        body: "Asked the ranger team to check the site.",
        createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
        authorId: "admin-1",
        authorName: "Alex Admin",
      },
      {
        id: "n1",
        body: "First look: photo is blurry.",
        createdAt: new Date(Date.now() - 26 * 3_600_000).toISOString(),
        authorId: null,
        authorName: null,
      },
    ];

    it("lists earlier notes newest first, with Former admin for deleted authors", async () => {
      vi.mocked(fetchAdminNotes).mockResolvedValue(earlier);
      renderScreen();

      const list = await screen.findByRole("list", { name: notes.listLabel });
      const items = within(list).getAllByRole("listitem");
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent("Alex Admin");
      expect(items[0]).toHaveTextContent(earlier[0]?.body ?? "");
      expect(items[1]).toHaveTextContent(notes.formerAdmin);
      expect(fetchAdminNotes).toHaveBeenCalledWith(testTarsier.id);
      expect(screen.getByText(notes.permanence)).toBeInTheDocument();
    });

    it("saves a note with the button and clears the box", async () => {
      const user = userEvent.setup();
      renderScreen();
      const box = await screen.findByRole("textbox", { name: notes.label });
      const save = screen.getByRole("button", { name: notes.save });
      expect(save).toBeDisabled();

      await user.type(box, "  Coordinates look wrong. ");
      await user.click(save);

      expect(addAdminNote).toHaveBeenCalledWith(
        testTarsier.id,
        "  Coordinates look wrong. ",
      );
      expect(await screen.findByText(notes.saved)).toBeInTheDocument();
      expect(box).toHaveValue("");
      await vi.waitFor(() => {
        expect(fetchAdminNotes).toHaveBeenCalledTimes(2);
      });
    });

    it("keeps the text when saving fails", async () => {
      vi.mocked(addAdminNote).mockRejectedValueOnce(new Error("network"));
      const user = userEvent.setup();
      renderScreen();
      const box = await screen.findByRole("textbox", { name: notes.label });

      await user.type(box, "Keep me");
      await user.click(screen.getByRole("button", { name: notes.save }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        notes.saveFailed,
      );
      expect(box).toHaveValue("Keep me");
    });

    it("saves unsaved text with the decision", async () => {
      const user = userEvent.setup();
      renderScreen();
      const box = await screen.findByRole("textbox", { name: notes.label });
      await user.type(box, "Approved after checking the map.");
      const bar = screen.getByRole("region", { name: strings.decision.label });

      await user.click(
        within(bar).getByRole("button", { name: strings.decision.approve }),
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveTextContent(notes.savedWithDecision);
      await user.click(
        within(dialog).getByRole("button", {
          name: posts.moderation.confirm.approve,
        }),
      );

      await vi.waitFor(() => {
        expect(addAdminNote).toHaveBeenCalledWith(
          testTarsier.id,
          "Approved after checking the map.",
        );
      });
      expect(decidePostsMock).toHaveBeenCalledTimes(1);
      expect(decidePostsMock.mock.invocationCallOrder[0] ?? 0).toBeLessThan(
        vi.mocked(addAdminNote).mock.invocationCallOrder[0] ?? 0,
      );
    });

    it("doesn't save anything with a decision when the box is empty", async () => {
      const user = userEvent.setup();
      renderScreen();
      const bar = await screen.findByRole("region", {
        name: strings.decision.label,
      });

      await user.click(
        within(bar).getByRole("button", { name: strings.decision.approve }),
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog).not.toHaveTextContent(notes.savedWithDecision);
      await user.click(
        within(dialog).getByRole("button", {
          name: posts.moderation.confirm.approve,
        }),
      );

      expect(
        await screen.findByText(posts.moderation.success.approve),
      ).toBeInTheDocument();
      expect(addAdminNote).not.toHaveBeenCalled();
    });

    it("offers a retry when earlier notes fail to load", async () => {
      vi.mocked(fetchAdminNotes).mockRejectedValueOnce(new Error("network"));
      const user = userEvent.setup();
      renderScreen();

      expect(await screen.findByRole("alert")).toHaveTextContent(
        notes.loadFailed,
      );
      vi.mocked(fetchAdminNotes).mockResolvedValue(earlier);
      await user.click(screen.getByRole("button", { name: notes.retry }));

      expect(
        await screen.findByRole("list", { name: notes.listLabel }),
      ).toBeInTheDocument();
    });
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

  it("shows the place name above the coordinates when known", async () => {
    vi.mocked(fetchPost).mockResolvedValue({
      ...testTarsier,
      location: { ...testTarsier.location, placeName: "Lusod, Kabayan" },
    });
    renderScreen();
    await screen.findByRole("heading", { level: 2, name: title });

    expect(screen.getByText("Lusod, Kabayan")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: strings.location.copyLabel }),
    ).toBeInTheDocument();
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

  describe("decisions", () => {
    const moderation = posts.moderation;

    async function findBar() {
      return screen.findByRole("region", { name: strings.decision.label });
    }

    it("offers Decline and Approve on a pending post; Request changes stays off", async () => {
      renderScreen();
      const bar = await findBar();

      expect(
        within(bar).getByRole("button", { name: strings.decision.decline }),
      ).toBeEnabled();
      expect(
        within(bar).getByRole("button", { name: strings.decision.approve }),
      ).toBeEnabled();
      const requestChanges = within(bar).getByRole("button", {
        name: strings.decision.requestChanges,
      });
      expect(requestChanges).toBeDisabled();
      expect(requestChanges).toHaveAttribute(
        "title",
        strings.decision.requestChangesUnavailable,
      );
    });

    it("approves after confirming and stays on the post showing the result", async () => {
      vi.mocked(fetchPost)
        .mockResolvedValueOnce(testTarsier)
        .mockResolvedValue({ ...testTarsier, status: "approved" });
      const user = userEvent.setup();
      renderScreen();
      const bar = await findBar();

      await user.click(
        within(bar).getByRole("button", { name: strings.decision.approve }),
      );
      await user.click(
        within(
          screen.getByRole("dialog", { name: moderation.title.approve }),
        ).getByRole("button", { name: moderation.confirm.approve }),
      );

      expect(decidePostsMock).toHaveBeenCalledWith(
        [testTarsier.id],
        "approve",
        null,
      );
      expect(
        await screen.findByText(moderation.success.approve),
      ).toBeInTheDocument();
      expect(
        await within(bar).findByText(posts.status.approved),
      ).toBeInTheDocument();
      expect(
        within(bar).queryByRole("button", { name: strings.decision.approve }),
      ).not.toBeInTheDocument();
      expect(
        within(bar).getByRole("button", { name: strings.decision.takeDown }),
      ).toBeInTheDocument();
    });

    it("takes down an approved post with a reason", async () => {
      vi.mocked(fetchPost).mockResolvedValue({
        ...testTarsier,
        status: "approved",
      });
      const user = userEvent.setup();
      renderScreen();
      const bar = await findBar();

      await user.click(
        within(bar).getByRole("button", { name: strings.decision.takeDown }),
      );
      const dialog = screen.getByRole("dialog", {
        name: moderation.title.takeDown,
      });
      expect(dialog).toHaveAccessibleDescription(moderation.body.takeDown);
      const confirm = within(dialog).getByRole("button", {
        name: moderation.confirm.takeDown,
      });
      expect(confirm).toBeDisabled();

      await user.click(
        within(dialog).getByRole("radio", {
          name: moderation.reasons.inappropriateContent,
        }),
      );
      await user.click(confirm);

      expect(decidePostsMock).toHaveBeenCalledWith(
        [testTarsier.id],
        "takeDown",
        "inappropriateContent",
      );
      expect(
        await screen.findByText(moderation.success.takeDown),
      ).toBeInTheDocument();
    });

    it("shows only the outcome on a declined post", async () => {
      vi.mocked(fetchPost).mockResolvedValue({
        ...testTarsier,
        status: "declined",
      });
      renderScreen();
      const bar = await findBar();

      expect(within(bar).getByText(posts.status.declined)).toBeInTheDocument();
      expect(within(bar).queryByRole("button")).not.toBeInTheDocument();
    });

    it("closes the dialog on Escape without deciding", async () => {
      const user = userEvent.setup();
      renderScreen();
      const bar = await findBar();

      await user.click(
        within(bar).getByRole("button", { name: strings.decision.decline }),
      );
      const dialog = screen.getByRole("dialog", {
        name: moderation.title.decline,
      });
      fireEvent(dialog, new Event("cancel", { cancelable: true }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(decidePostsMock).not.toHaveBeenCalled();
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
