import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppStrings } from "../../../../core/constants/appStrings";
import { createQueryWrapper } from "../../../../test/queryWrapper";
import { AdminActionError, type AdminMember } from "../../models/adminMember";
import {
  cancelInvite,
  inviteAdmin,
  listAdmins,
  removeAdmin,
  resendInvite,
} from "../../services/adminsService";
import { AdminsScreen } from "./AdminsScreen";

vi.mock("../../services/adminsService", () => ({
  listAdmins: vi.fn(),
  removeAdmin: vi.fn(),
  inviteAdmin: vi.fn(),
  resendInvite: vi.fn(),
  cancelInvite: vi.fn(),
}));

const strings = AppStrings.admins;

const me: AdminMember = {
  userId: "me",
  email: "me@faunawatch.dev",
  name: "Pilot",
  status: "active",
  invitedAt: null,
  lastSignInAt: new Date(),
  addedAt: new Date(),
  isYou: true,
};
const colleague: AdminMember = {
  ...me,
  userId: "colleague",
  email: "colleague@faunawatch.dev",
  name: null,
  isYou: false,
};
const invited: AdminMember = {
  ...me,
  userId: "invited",
  email: "new@faunawatch.dev",
  name: null,
  status: "invited",
  invitedAt: new Date(),
  lastSignInAt: null,
  isYou: false,
};
const expired: AdminMember = {
  ...invited,
  userId: "expired",
  email: "late@faunawatch.dev",
  invitedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
};

function renderScreen() {
  return render(<AdminsScreen />, { wrapper: createQueryWrapper() });
}

function row(email: string): HTMLElement {
  const cell = screen.getByText(email);
  const tr = cell.closest("tr");
  if (!tr) throw new Error("no row");
  return tr;
}

beforeEach(() => {
  vi.mocked(listAdmins).mockReset();
  vi.mocked(listAdmins).mockResolvedValue([me, colleague, invited, expired]);
  for (const fn of [removeAdmin, resendInvite, cancelInvite]) {
    vi.mocked(fn).mockReset();
    vi.mocked(fn).mockResolvedValue(undefined);
  }
  vi.mocked(inviteAdmin).mockReset();
  vi.mocked(inviteAdmin).mockResolvedValue("invited");
});

describe("AdminsScreen", () => {
  it("lists admins with their status and the right actions", async () => {
    renderScreen();

    expect(await screen.findByText("Pilot")).toBeInTheDocument();
    const mine = row("Pilot");
    expect(within(mine).getByText(strings.you)).toBeInTheDocument();
    expect(within(mine).queryByRole("button")).toBeNull();

    const other = row("colleague@faunawatch.dev");
    expect(within(other).getByText(strings.statusActive)).toBeInTheDocument();
    expect(
      within(other).getByRole("button", { name: strings.actions.remove }),
    ).toBeInTheDocument();

    const pending = row("new@faunawatch.dev");
    expect(
      within(pending).getByText(strings.statusInvited),
    ).toBeInTheDocument();
    expect(
      within(pending).getByRole("button", { name: strings.actions.resend }),
    ).toBeInTheDocument();
    expect(
      within(pending).getByRole("button", { name: strings.actions.cancel }),
    ).toBeInTheDocument();

    expect(
      within(row("late@faunawatch.dev")).getByText(strings.statusExpired),
    ).toBeInTheDocument();
  });

  it("invites an admin and confirms", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("Pilot");

    await user.click(screen.getByRole("button", { name: strings.invite }));
    await user.type(
      screen.getByLabelText(strings.inviteDialog.emailLabel),
      "Fresh@FaunaWatch.dev",
    );
    await user.click(
      screen.getByRole("button", { name: strings.inviteDialog.submit }),
    );

    expect(inviteAdmin).toHaveBeenCalledWith("Fresh@FaunaWatch.dev");
    expect(
      await screen.findByText(
        strings.success.invited.replace("{email}", "fresh@faunawatch.dev"),
      ),
    ).toBeInTheDocument();
    expect(listAdmins).toHaveBeenCalledTimes(2);
  });

  it("a refused invitation explains why and keeps the dialog open", async () => {
    vi.mocked(inviteAdmin).mockRejectedValue(
      new AdminActionError("hasAccount"),
    );
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("Pilot");

    await user.click(screen.getByRole("button", { name: strings.invite }));
    await user.type(
      screen.getByLabelText(strings.inviteDialog.emailLabel),
      "appuser@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: strings.inviteDialog.submit }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      strings.errors.hasAccount,
    );
    expect(
      screen.getByLabelText(strings.inviteDialog.emailLabel),
    ).toBeVisible();
  });

  it("an empty email is not sent", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("Pilot");

    await user.click(screen.getByRole("button", { name: strings.invite }));
    await user.click(
      screen.getByRole("button", { name: strings.inviteDialog.submit }),
    );
    expect(inviteAdmin).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      strings.errors.invalidEmail,
    );
  });

  it("resends an invitation", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("Pilot");

    await user.click(
      within(row("new@faunawatch.dev")).getByRole("button", {
        name: strings.actions.resend,
      }),
    );
    expect(resendInvite).toHaveBeenCalledWith("invited");
    expect(
      await screen.findByText(
        strings.success.resent.replace("{email}", "new@faunawatch.dev"),
      ),
    ).toBeInTheDocument();
  });

  it("removing asks first, then removes", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("Pilot");

    await user.click(
      within(row("colleague@faunawatch.dev")).getByRole("button", {
        name: strings.actions.remove,
      }),
    );
    expect(removeAdmin).not.toHaveBeenCalled();
    expect(screen.getByText(strings.confirm.removeTitle)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: strings.confirm.removeConfirm }),
    );
    expect(removeAdmin).toHaveBeenCalledWith("colleague");
    expect(
      await screen.findByText(
        strings.success.removed.replace("{email}", "colleague@faunawatch.dev"),
      ),
    ).toBeInTheDocument();
  });

  it("cancelling an invitation asks first; Keep does nothing", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("Pilot");

    const cancel = within(row("new@faunawatch.dev")).getByRole("button", {
      name: strings.actions.cancel,
    });
    await user.click(cancel);
    await user.click(
      screen.getByRole("button", { name: strings.confirm.keep }),
    );
    expect(cancelInvite).not.toHaveBeenCalled();

    await user.click(cancel);
    await user.click(
      screen.getByRole("button", { name: strings.confirm.cancelConfirm }),
    );
    expect(cancelInvite).toHaveBeenCalledWith("invited");
  });

  it("a refused removal shows the reason", async () => {
    vi.mocked(removeAdmin).mockRejectedValue(new AdminActionError("lastAdmin"));
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("Pilot");

    await user.click(
      within(row("colleague@faunawatch.dev")).getByRole("button", {
        name: strings.actions.remove,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: strings.confirm.removeConfirm }),
    );
    expect(
      await screen.findByText(strings.errors.lastAdmin),
    ).toBeInTheDocument();
  });

  it("a list that can't load says so", async () => {
    vi.mocked(listAdmins).mockRejectedValue(new AdminActionError("unknown"));
    renderScreen();
    expect(await screen.findByText(strings.loadFailed)).toBeInTheDocument();
  });
});
