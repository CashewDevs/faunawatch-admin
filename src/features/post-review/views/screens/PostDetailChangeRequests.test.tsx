import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../../../core/constants/appRoutes";
import { AppStrings } from "../../../../core/constants/appStrings";
import { fetchIsUserVerified } from "../../../users/services/usersService";
import { ChangeRequestError } from "../../models/changeRequest";
import { ModerationError } from "../../models/moderation";
import type { PostSummary } from "../../models/post";
import {
  addAdminNote,
  fetchAdminNotes,
} from "../../services/adminNotesService";
import {
  fetchChangeRequests,
  requestChanges,
  withdrawChangeRequest,
} from "../../services/changeRequestService";
import { decidePosts } from "../../services/moderationService";
import { fetchAllPosts, fetchPost } from "../../services/postsService";
import {
  testChangeRequests,
  testPosts,
  testTarsier,
} from "../../../../test/fixtures/posts";
import { createRouterQueryWrapper } from "../../../../test/routerWrapper";
import { PostDetailScreen } from "./PostDetailScreen";

const flag = vi.hoisted(() => ({ requestChanges: false }));

vi.mock("../../../../core/constants/featureFlags", () => ({
  isRequestChangesEnabled: () => flag.requestChanges,
}));

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

vi.mock("../../services/commentModerationService", () => ({
  moderateComment: vi.fn(),
}));

vi.mock("../../services/changeRequestService", () => ({
  fetchChangeRequests: vi.fn(),
  requestChanges: vi.fn(),
  withdrawChangeRequest: vi.fn(),
}));

vi.mock("../../services/adminNotesService", () => ({
  fetchAdminNotes: vi.fn(),
  addAdminNote: vi.fn(),
}));

const posts = AppStrings.posts;
const strings = posts.detail;
const dialogStrings = posts.changeRequest;
const historyStrings = strings.changeRequests;
const sentBack = { ...testTarsier, status: "changes_requested" } as const;

function renderScreen() {
  return render(
    <Routes>
      <Route path={AppRoutes.postDetail} element={<PostDetailScreen />} />
    </Routes>,
    {
      wrapper: createRouterQueryWrapper(`/posts/${testTarsier.id}`),
    },
  );
}

async function findBar() {
  return screen.findByRole("region", { name: strings.decision.label });
}

describe("Request changes on the post page", () => {
  beforeEach(() => {
    flag.requestChanges = true;
    vi.mocked(decidePosts).mockReset();
    vi.mocked(decidePosts).mockResolvedValue(undefined);
    vi.mocked(requestChanges).mockReset();
    vi.mocked(requestChanges).mockResolvedValue(undefined);
    vi.mocked(withdrawChangeRequest).mockReset();
    vi.mocked(withdrawChangeRequest).mockResolvedValue(undefined);
    vi.mocked(fetchChangeRequests).mockReset();
    vi.mocked(fetchChangeRequests).mockResolvedValue([]);
    vi.mocked(fetchPost).mockReset();
    vi.mocked(fetchPost).mockResolvedValue(testTarsier);
    vi.mocked(fetchAllPosts).mockResolvedValue([...testPosts]);
    vi.mocked(fetchIsUserVerified).mockResolvedValue(false);
    vi.mocked(fetchAdminNotes).mockReset();
    vi.mocked(fetchAdminNotes).mockResolvedValue([]);
    vi.mocked(addAdminNote).mockReset();
    vi.mocked(addAdminNote).mockResolvedValue(undefined);
  });

  describe("the switch", () => {
    it("enables the button on a pending post when on", async () => {
      renderScreen();
      const bar = await findBar();

      const button = within(bar).getByRole("button", {
        name: strings.decision.requestChanges,
      });
      expect(button).toBeEnabled();
      expect(button).not.toHaveAttribute("title");
    });

    it("keeps the button disabled with its title when off", async () => {
      flag.requestChanges = false;
      renderScreen();
      const bar = await findBar();

      const button = within(bar).getByRole("button", {
        name: strings.decision.requestChanges,
      });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute(
        "title",
        strings.decision.requestChangesUnavailable,
      );
    });
  });

  describe("requesting changes", () => {
    async function openDialog(user: ReturnType<typeof userEvent.setup>) {
      const bar = await findBar();
      await user.click(
        within(bar).getByRole("button", {
          name: strings.decision.requestChanges,
        }),
      );
      return screen.getByRole("dialog", { name: dialogStrings.title.request });
    }

    it("explains the request and needs a non-blank message", async () => {
      const user = userEvent.setup();
      renderScreen();
      const dialog = await openDialog(user);

      expect(dialog).toHaveAccessibleDescription(dialogStrings.body.request);
      const confirm = within(dialog).getByRole("button", {
        name: dialogStrings.confirm.request,
      });
      expect(confirm).toBeDisabled();
      const message = within(dialog).getByRole("textbox", {
        name: dialogStrings.messageLabel,
      });
      expect(message).toBeRequired();
      expect(message).toHaveAttribute("maxlength", "500");

      await user.type(message, "   ");
      expect(confirm).toBeDisabled();
      await user.type(message, "Blurry photo");
      expect(confirm).toBeEnabled();
    });

    it("offers the four optional fixes, none ticked at first", async () => {
      const user = userEvent.setup();
      renderScreen();
      const dialog = await openDialog(user);

      const group = within(dialog).getByRole("group", {
        name: dialogStrings.fieldsLabel,
      });
      const boxes = within(group).getAllByRole("checkbox");
      expect(boxes.map((box) => box.parentElement?.textContent)).toEqual([
        dialogStrings.fields.photos,
        dialogStrings.fields.speciesDescription,
        dialogStrings.fields.location,
        dialogStrings.fields.category,
      ]);
      boxes.forEach((box) => {
        expect(box).not.toBeChecked();
      });
    });

    it("shows how much of the message is used near the limit", async () => {
      const user = userEvent.setup();
      renderScreen();
      const dialog = await openDialog(user);
      const message = within(dialog).getByRole("textbox", {
        name: dialogStrings.messageLabel,
      });

      fireEvent.change(message, { target: { value: "a".repeat(100) } });
      expect(within(dialog).queryByText(/\/ 500/)).not.toBeInTheDocument();

      fireEvent.change(message, { target: { value: "a".repeat(460) } });
      const counter = within(dialog).getByText("460 / 500");
      // The count is announced politely as it appears.
      expect(counter).toHaveAttribute("aria-live", "polite");
    });

    it("sends the message and ticks, then stays on the post with the result", async () => {
      vi.mocked(fetchPost)
        .mockResolvedValueOnce(testTarsier)
        .mockResolvedValue(sentBack);
      const user = userEvent.setup();
      renderScreen();
      const dialog = await openDialog(user);

      await user.click(
        within(dialog).getByRole("checkbox", {
          name: dialogStrings.fields.photos,
        }),
      );
      await user.click(
        within(dialog).getByRole("checkbox", {
          name: dialogStrings.fields.location,
        }),
      );
      await user.type(
        within(dialog).getByRole("textbox", {
          name: dialogStrings.messageLabel,
        }),
        " Retake the photo ",
      );
      const loads = vi.mocked(fetchPost).mock.calls.length;
      await user.click(
        within(dialog).getByRole("button", {
          name: dialogStrings.confirm.request,
        }),
      );

      expect(requestChanges).toHaveBeenCalledWith(
        testTarsier.id,
        " Retake the photo ",
        ["photos", "location"],
      );
      expect(
        await screen.findByText(dialogStrings.success.request),
      ).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(vi.mocked(fetchPost).mock.calls.length).toBeGreaterThan(loads);
      const bar = await findBar();
      expect(
        await within(bar).findByText(posts.status.changes_requested),
      ).toBeInTheDocument();
    });

    it("saves unsaved admin note text with the request", async () => {
      const user = userEvent.setup();
      renderScreen();
      await user.type(
        await screen.findByRole("textbox", {
          name: strings.notes.label,
        }),
        "Reporter has sent blurry photos before",
      );
      const dialog = await openDialog(user);
      expect(dialog).toHaveTextContent(strings.notes.savedWithChange);
      expect(dialog).not.toHaveTextContent(strings.notes.savedWithDecision);

      await user.type(
        within(dialog).getByRole("textbox", {
          name: dialogStrings.messageLabel,
        }),
        "Retake the photo",
      );
      await user.click(
        within(dialog).getByRole("button", {
          name: dialogStrings.confirm.request,
        }),
      );

      await screen.findByText(dialogStrings.success.request);
      expect(addAdminNote).toHaveBeenCalledWith(
        testTarsier.id,
        "Reporter has sent blurry photos before",
      );
      expect(
        vi.mocked(requestChanges).mock.invocationCallOrder[0],
      ).toBeLessThan(vi.mocked(addAdminNote).mock.invocationCallOrder[0] ?? 0);
    });

    it("does not save the note when the request fails", async () => {
      vi.mocked(requestChanges).mockRejectedValue(new Error("network"));
      const user = userEvent.setup();
      renderScreen();
      await user.type(
        await screen.findByRole("textbox", {
          name: strings.notes.label,
        }),
        "Draft note",
      );
      const dialog = await openDialog(user);
      await user.type(
        within(dialog).getByRole("textbox", {
          name: dialogStrings.messageLabel,
        }),
        "Retake it",
      );
      await user.click(
        within(dialog).getByRole("button", {
          name: dialogStrings.confirm.request,
        }),
      );

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        dialogStrings.failed,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(addAdminNote).not.toHaveBeenCalled();
    });

    it.each([
      ["notPending", dialogStrings.errors.notPending],
      ["notFound", dialogStrings.errors.notFound],
      ["forbidden", dialogStrings.errors.forbidden],
    ] as const)(
      "closes the dialog with the %s message and reloads the post",
      async (kind, message) => {
        vi.mocked(requestChanges).mockRejectedValue(
          new ChangeRequestError(kind),
        );
        const user = userEvent.setup();
        renderScreen();
        const dialog = await openDialog(user);
        await user.type(
          within(dialog).getByRole("textbox", {
            name: dialogStrings.messageLabel,
          }),
          "Retake it",
        );
        const loads = vi.mocked(fetchPost).mock.calls.length;
        await user.click(
          within(dialog).getByRole("button", {
            name: dialogStrings.confirm.request,
          }),
        );

        expect(await screen.findByText(message)).toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(vi.mocked(fetchPost).mock.calls.length).toBeGreaterThan(loads);
      },
    );

    it("keeps the dialog open with a clear message when the server refuses the message", async () => {
      vi.mocked(requestChanges).mockRejectedValue(
        new ChangeRequestError("invalidInput"),
      );
      const user = userEvent.setup();
      renderScreen();
      const dialog = await openDialog(user);
      await user.type(
        within(dialog).getByRole("textbox", {
          name: dialogStrings.messageLabel,
        }),
        "Retake it",
      );
      await user.click(
        within(dialog).getByRole("button", {
          name: dialogStrings.confirm.request,
        }),
      );

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        dialogStrings.invalidMessage,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      // The message is kept so it can be fixed and sent again.
      expect(
        within(dialog).getByRole("textbox", {
          name: dialogStrings.messageLabel,
        }),
      ).toHaveValue("Retake it");
    });

    it("closes on Escape without sending anything", async () => {
      const user = userEvent.setup();
      renderScreen();
      const dialog = await openDialog(user);

      fireEvent(dialog, new Event("cancel", { cancelable: true }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(requestChanges).not.toHaveBeenCalled();
    });
  });

  describe("a post waiting for the reporter", () => {
    beforeEach(() => {
      // Withdraw must work whatever the switch says.
      flag.requestChanges = false;
      vi.mocked(fetchPost).mockResolvedValue(sentBack);
      vi.mocked(fetchChangeRequests).mockResolvedValue([...testChangeRequests]);
    });

    it("shows the amber pill and Withdraw request, not the decisions", async () => {
      renderScreen();
      const bar = await findBar();

      expect(
        await within(bar).findByText(posts.status.changes_requested),
      ).toBeInTheDocument();
      expect(
        within(bar).getByRole("button", {
          name: strings.decision.withdrawRequest,
        }),
      ).toBeEnabled();
      [
        strings.decision.approve,
        strings.decision.decline,
        strings.decision.requestChanges,
        strings.decision.takeDown,
      ].forEach((name) => {
        expect(
          within(bar).queryByRole("button", { name }),
        ).not.toBeInTheDocument();
      });
    });

    it("withdraws after confirming, with no reason", async () => {
      vi.mocked(fetchPost)
        .mockResolvedValueOnce(sentBack)
        .mockResolvedValue(testTarsier);
      const user = userEvent.setup();
      renderScreen();
      const bar = await findBar();

      await user.click(
        await within(bar).findByRole("button", {
          name: strings.decision.withdrawRequest,
        }),
      );
      const dialog = screen.getByRole("dialog", {
        name: dialogStrings.title.withdraw,
      });
      expect(dialog).toHaveAccessibleDescription(dialogStrings.body.withdraw);
      expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
      expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
      await user.click(
        within(dialog).getByRole("button", {
          name: dialogStrings.confirm.withdraw,
        }),
      );

      expect(withdrawChangeRequest).toHaveBeenCalledWith(testTarsier.id);
      expect(
        await screen.findByText(dialogStrings.success.withdraw),
      ).toBeInTheDocument();
      // Pending again: the decisions are back and Withdraw is gone.
      expect(
        await within(bar).findByRole("button", {
          name: strings.decision.approve,
        }),
      ).toBeInTheDocument();
      expect(
        within(bar).queryByRole("button", {
          name: strings.decision.withdrawRequest,
        }),
      ).not.toBeInTheDocument();
    });

    it("saves unsaved note text with a withdrawal, and says so", async () => {
      vi.mocked(fetchPost)
        .mockResolvedValueOnce(sentBack)
        .mockResolvedValue(testTarsier);
      const user = userEvent.setup();
      renderScreen();
      await user.type(
        await screen.findByRole("textbox", { name: strings.notes.label }),
        "Reporter will resend",
      );
      const bar = await findBar();
      await user.click(
        await within(bar).findByRole("button", {
          name: strings.decision.withdrawRequest,
        }),
      );
      const dialog = screen.getByRole("dialog", {
        name: dialogStrings.title.withdraw,
      });
      expect(dialog).toHaveTextContent(strings.notes.savedWithChange);
      await user.click(
        within(dialog).getByRole("button", {
          name: dialogStrings.confirm.withdraw,
        }),
      );

      await screen.findByText(dialogStrings.success.withdraw);
      expect(addAdminNote).toHaveBeenCalledWith(
        testTarsier.id,
        "Reporter will resend",
      );
    });

    it("explains when the reporter resubmitted first", async () => {
      vi.mocked(withdrawChangeRequest).mockRejectedValue(
        new ChangeRequestError("notAwaitingChanges"),
      );
      const user = userEvent.setup();
      renderScreen();
      const bar = await findBar();

      await user.click(
        await within(bar).findByRole("button", {
          name: strings.decision.withdrawRequest,
        }),
      );
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: dialogStrings.confirm.withdraw,
        }),
      );

      expect(
        await screen.findByText(dialogStrings.errors.notAwaitingChanges),
      ).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("the change request history", () => {
    async function findHistory() {
      const heading = await screen.findByRole("heading", {
        name: historyStrings.heading,
      });
      const section = heading.closest("section");
      if (!section) throw new Error("No history card");
      return section;
    }

    it("is left out when the post has no requests", async () => {
      renderScreen();
      await findBar();

      expect(
        screen.queryByRole("heading", { name: historyStrings.heading }),
      ).not.toBeInTheDocument();
    });

    it("lists every round newest first with message, fixes, author and outcome", async () => {
      vi.mocked(fetchChangeRequests).mockResolvedValue([...testChangeRequests]);
      renderScreen();
      const section = await findHistory();

      const rounds = within(
        within(section).getByRole("list", { name: historyStrings.listLabel }),
      )
        .getAllByRole("listitem")
        .filter((item) => item.textContent.includes(historyStrings.round));
      expect(rounds).toHaveLength(3);

      const [open, withdrawn, resubmitted] = rounds;
      if (!open || !withdrawn || !resubmitted) throw new Error("Rounds");

      expect(open).toHaveTextContent(`${historyStrings.round} 3`);
      expect(open).toHaveTextContent("Please pin the exact spot.");
      expect(open).toHaveTextContent(dialogStrings.fields.location);
      expect(open).toHaveTextContent(dialogStrings.fields.category);
      expect(open).toHaveTextContent(
        `${historyStrings.requestedByPrefix} Alex Admin`,
      );
      expect(open).toHaveTextContent(historyStrings.waitingSince);

      expect(withdrawn).toHaveTextContent(`${historyStrings.round} 2`);
      expect(withdrawn).toHaveTextContent(
        `${historyStrings.withdrawnByPrefix} ${historyStrings.formerAdmin}`,
      );
      expect(withdrawn).not.toHaveTextContent(historyStrings.waitingSince);

      expect(resubmitted).toHaveTextContent(`${historyStrings.round} 1`);
      expect(resubmitted).toHaveTextContent(historyStrings.resubmitted);
      expect(resubmitted).toHaveTextContent(
        `${historyStrings.requestedByPrefix} ${historyStrings.formerAdmin}`,
      );
      expect(resubmitted).not.toHaveTextContent(
        historyStrings.withdrawnByPrefix,
      );
    });

    it("keeps line breaks in a message", async () => {
      vi.mocked(fetchChangeRequests).mockResolvedValue([...testChangeRequests]);
      renderScreen();
      await findHistory();

      const message = screen.getByText(/Please pin the exact spot\./);
      expect(message.textContent).toBe(
        "Please pin the exact spot.\nThe map shows the wrong trail.",
      );
      expect(message).toHaveClass("whitespace-pre-wrap");
    });

    it("shows history on a post that is no longer waiting, whatever the switch says", async () => {
      flag.requestChanges = false;
      vi.mocked(fetchChangeRequests).mockResolvedValue([...testChangeRequests]);
      renderScreen();

      expect(await findHistory()).toBeInTheDocument();
    });

    it("offers a retry when the history can't be loaded", async () => {
      vi.mocked(fetchChangeRequests).mockRejectedValueOnce(
        new Error("network"),
      );
      vi.mocked(fetchChangeRequests).mockResolvedValue([...testChangeRequests]);
      const user = userEvent.setup();
      renderScreen();

      expect(
        await screen.findByText(historyStrings.loadFailed),
      ).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: historyStrings.retry }),
      );

      expect(
        await screen.findByRole("list", { name: historyStrings.listLabel }),
      ).toBeInTheDocument();
    });
  });

  describe("deciding a post that was sent back meanwhile", () => {
    it("says it is waiting for the reporter, not decided by another admin", async () => {
      vi.mocked(decidePosts).mockRejectedValue(
        new ModerationError("alreadyDecided"),
      );
      vi.mocked(fetchAllPosts).mockResolvedValue(
        testPosts.map((post) =>
          post.id === testTarsier.id
            ? { ...post, status: "changes_requested" as const }
            : post,
        ),
      );
      // The page still shows the post as pending when Approve is pressed.
      vi.mocked(fetchPost)
        .mockResolvedValueOnce(testTarsier)
        .mockResolvedValue(sentBack);
      const user = userEvent.setup();
      renderScreen();

      const bar = await findBar();
      await user.click(
        await within(bar).findByRole("button", {
          name: strings.decision.approve,
        }),
      );
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: posts.moderation.confirm.approve,
        }),
      );

      expect(
        await screen.findByText(posts.moderation.errors.awaitingChanges),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(posts.moderation.errors.alreadyDecided),
      ).not.toBeInTheDocument();
    });

    it("shows the generic message at once and swaps it after the reload", async () => {
      vi.mocked(decidePosts).mockRejectedValue(
        new ModerationError("alreadyDecided"),
      );
      let finishReload: (posts: PostSummary[]) => void = () => undefined;
      vi.mocked(fetchAllPosts)
        .mockResolvedValueOnce([...testPosts])
        .mockReturnValueOnce(
          new Promise((resolve) => {
            finishReload = resolve;
          }),
        );
      const user = userEvent.setup();
      renderScreen();
      const bar = await findBar();
      await user.click(
        within(bar).getByRole("button", { name: strings.decision.approve }),
      );
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: posts.moderation.confirm.approve,
        }),
      );

      // The reload is still running, yet the admin already has an answer.
      expect(
        await screen.findByText(posts.moderation.errors.alreadyDecided),
      ).toBeInTheDocument();

      finishReload(
        testPosts.map((post) =>
          post.id === testTarsier.id
            ? { ...post, status: "changes_requested" as const }
            : post,
        ),
      );
      expect(
        await screen.findByText(posts.moderation.errors.awaitingChanges),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(posts.moderation.errors.alreadyDecided),
      ).not.toBeInTheDocument();
    });

    it("doesn't swap in a message once another dialog has been opened", async () => {
      vi.mocked(decidePosts).mockRejectedValue(
        new ModerationError("alreadyDecided"),
      );
      let finishReload: (posts: PostSummary[]) => void = () => undefined;
      vi.mocked(fetchAllPosts)
        .mockResolvedValueOnce([...testPosts])
        .mockReturnValueOnce(
          new Promise((resolve) => {
            finishReload = resolve;
          }),
        );
      const user = userEvent.setup();
      renderScreen();
      const bar = await findBar();
      await user.click(
        within(bar).getByRole("button", { name: strings.decision.approve }),
      );
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: posts.moderation.confirm.approve,
        }),
      );
      await screen.findByText(posts.moderation.errors.alreadyDecided);

      // The admin moves on: opening a dialog clears the old message.
      await user.click(
        within(bar).getByRole("button", {
          name: strings.decision.requestChanges,
        }),
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      finishReload(
        testPosts.map((post) =>
          post.id === testTarsier.id
            ? { ...post, status: "changes_requested" as const }
            : post,
        ),
      );

      await vi.waitFor(() => {
        expect(vi.mocked(fetchAllPosts)).toHaveBeenCalledTimes(2);
      });
      expect(
        screen.queryByText(posts.moderation.errors.awaitingChanges),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(posts.moderation.errors.alreadyDecided),
      ).not.toBeInTheDocument();
    });

    it("still says decided by another admin when it was decided", async () => {
      vi.mocked(decidePosts).mockRejectedValue(
        new ModerationError("alreadyDecided"),
      );
      const user = userEvent.setup();
      renderScreen();
      const bar = await findBar();

      await user.click(
        within(bar).getByRole("button", { name: strings.decision.approve }),
      );
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: posts.moderation.confirm.approve,
        }),
      );

      expect(
        await screen.findByText(posts.moderation.errors.alreadyDecided),
      ).toBeInTheDocument();
    });
  });
});
