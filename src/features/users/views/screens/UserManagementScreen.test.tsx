import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppStrings } from "../../../../core/constants/appStrings";
import {
  testUserCounts,
  testUserPage,
  testUsers,
} from "../../../../test/fixtures/users";
import { createQueryWrapper } from "../../../../test/queryWrapper";
import {
  fetchSanctionsSince,
  fetchUserCounts,
  fetchUserPage,
} from "../../services/usersService";
import { SuspensionError } from "../../models/suspension";
import { reactivateUser, suspendUser } from "../../services/suspensionService";
import { UserManagementScreen } from "./UserManagementScreen";

vi.mock("../../services/usersService", () => ({
  fetchUserPage: vi.fn(),
  fetchUserCounts: vi.fn(),
  fetchSanctionsSince: vi.fn(),
}));

vi.mock("../../services/suspensionService", () => ({
  suspendUser: vi.fn(),
  reactivateUser: vi.fn(),
}));

const strings = AppStrings.users;

function renderScreen() {
  return render(<UserManagementScreen />, { wrapper: createQueryWrapper() });
}

describe("UserManagementScreen", () => {
  beforeEach(() => {
    vi.mocked(fetchUserPage).mockImplementation((query) =>
      Promise.resolve(testUserPage(query)),
    );
    vi.mocked(fetchUserCounts).mockResolvedValue(testUserCounts);
    vi.mocked(fetchSanctionsSince).mockResolvedValue([]);
    vi.mocked(suspendUser).mockReset();
    vi.mocked(suspendUser).mockResolvedValue(undefined);
    vi.mocked(reactivateUser).mockReset();
    vi.mocked(reactivateUser).mockResolvedValue(undefined);
  });

  it("renders the stats and a page of users", async () => {
    renderScreen();

    const table = screen.getByRole("table", { name: strings.table.caption });
    expect(await within(table).findByText("Enzo Morales")).toBeInTheDocument();
    // Header row + 10 user rows.
    expect(within(table).getAllByRole("row")).toHaveLength(11);
  });

  it("filters to suspended users", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("Enzo Morales");

    await user.click(
      screen.getByRole("button", { name: strings.statusFilter.suspended }),
    );

    expect(await screen.findByText("Klip Bautista")).toBeInTheDocument();
    expect(screen.queryByText("Enzo Morales")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: strings.statusFilter.suspended }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the empty state when the search matches nobody", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText("Enzo Morales");

    await user.type(
      screen.getByRole("searchbox", { name: strings.searchLabel }),
      "zzz-no-match",
    );

    expect(await screen.findByText(strings.empty)).toBeInTheDocument();
  });

  it("shows the error state with a retry button", async () => {
    vi.mocked(fetchUserPage).mockRejectedValueOnce(new Error("network"));
    renderScreen();

    expect(await screen.findByRole("alert")).toHaveTextContent(strings.error);
    expect(
      screen.getByRole("button", { name: strings.retry }),
    ).toBeInTheDocument();
  });

  it("locks the status switch for admins only", async () => {
    renderScreen();
    await screen.findByText("Enzo Morales");

    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(10);
    const locked = switches.filter((toggle) => toggle.hasAttribute("disabled"));
    expect(locked).toHaveLength(1);
    expect(locked[0]).toHaveAccessibleName(
      `${strings.table.toggleStatus}: Ramon Salazar (${strings.table.adminLocked})`,
    );
  });

  it("has no role column", async () => {
    renderScreen();
    await screen.findByText("Enzo Morales");

    expect(screen.getAllByRole("columnheader")).toHaveLength(5);
    expect(
      screen.queryByRole("columnheader", { name: "Role" }),
    ).not.toBeInTheDocument();
  });

  it("shows a preset avatar and fills in missing details", async () => {
    const [first] = testUsers;
    if (!first) throw new Error("fixture missing");
    vi.mocked(fetchUserPage).mockResolvedValue({
      users: [
        {
          ...first,
          fullName: "",
          username: null,
          email: null,
          avatar: { kind: "preset", name: "panda" },
        },
      ],
      totalCount: 1,
    });
    const { container } = renderScreen();

    expect(await screen.findByText(strings.table.unnamed)).toBeInTheDocument();
    expect(screen.getByText(strings.table.noEmail)).toBeInTheDocument();
    expect(container.querySelector('img[src*="panda"]')).not.toBeNull();
  });

  describe("suspend and reactivate", () => {
    const suspension = strings.suspension;

    async function openSwitch(name: string) {
      const user = userEvent.setup();
      await user.click(
        await screen.findByRole("switch", {
          name: `${strings.table.toggleStatus}: ${name}`,
        }),
      );
      return { user, dialog: await screen.findByRole("dialog") };
    }

    it("suspends after a length and reason are chosen", async () => {
      renderScreen();
      const { user, dialog } = await openSwitch("Enzo Morales");

      expect(dialog).toHaveAccessibleName("Suspend Enzo Morales?");
      const confirm = within(dialog).getByRole("button", {
        name: suspension.confirm.suspend,
      });
      expect(confirm).toBeDisabled();

      await user.click(
        within(dialog).getByRole("radio", {
          name: suspension.durations.sevenDays,
        }),
      );
      expect(confirm).toBeDisabled();
      await user.click(
        within(dialog).getByRole("radio", { name: suspension.reasons.spam }),
      );
      await user.type(
        within(dialog).getByRole("textbox", { name: suspension.detailsLabel }),
        "posted ads",
      );
      const loads = vi.mocked(fetchUserPage).mock.calls.length;
      await user.click(confirm);

      expect(suspendUser).toHaveBeenCalledWith(
        "test-user-24",
        "Spam: posted ads",
        7,
      );
      expect(await screen.findByRole("status")).toHaveTextContent(
        `Enzo Morales ${suspension.success.sevenDays}`,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await waitFor(() => {
        expect(vi.mocked(fetchUserPage).mock.calls.length).toBeGreaterThan(
          loads,
        );
      });
    });

    it("needs details for Other and can suspend until reactivated", async () => {
      renderScreen();
      const { user, dialog } = await openSwitch("Enzo Morales");

      await user.click(
        within(dialog).getByRole("radio", {
          name: suspension.durations.untilReactivated,
        }),
      );
      await user.click(
        within(dialog).getByRole("radio", { name: suspension.reasons.other }),
      );
      const confirm = within(dialog).getByRole("button", {
        name: suspension.confirm.suspend,
      });
      expect(confirm).toBeDisabled();

      await user.type(
        within(dialog).getByRole("textbox", {
          name: suspension.detailsRequiredLabel,
        }),
        "Impersonating a ranger",
      );
      await user.click(confirm);

      expect(suspendUser).toHaveBeenCalledWith(
        "test-user-24",
        "Impersonating a ranger",
        null,
      );
    });

    it("shows the suspension being lifted and reactivates", async () => {
      const user = userEvent.setup();
      renderScreen();
      await screen.findByText("Enzo Morales");
      await user.click(
        screen.getByRole("button", { name: strings.statusFilter.suspended }),
      );
      const { dialog } = await openSwitch("Klip Bautista");

      expect(dialog).toHaveAccessibleName("Reactivate Klip Bautista?");
      expect(dialog).toHaveTextContent("Spam: posted ads in comments");
      expect(dialog).toHaveTextContent(suspension.untilReactivated);
      expect(within(dialog).queryByRole("radio")).not.toBeInTheDocument();

      await user.click(
        within(dialog).getByRole("button", {
          name: suspension.confirm.reactivate,
        }),
      );

      expect(reactivateUser).toHaveBeenCalledWith("test-user-4");
      expect(await screen.findByRole("status")).toHaveTextContent(
        `Klip Bautista ${suspension.success.reactivate}`,
      );
    });

    it("closes and explains when another admin got there first", async () => {
      vi.mocked(suspendUser).mockRejectedValue(
        new SuspensionError("alreadySuspended"),
      );
      renderScreen();
      const { user, dialog } = await openSwitch("Enzo Morales");
      await user.click(
        within(dialog).getByRole("radio", {
          name: suspension.durations.oneDay,
        }),
      );
      await user.click(
        within(dialog).getByRole("radio", { name: suspension.reasons.spam }),
      );
      await user.click(
        within(dialog).getByRole("button", {
          name: suspension.confirm.suspend,
        }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        suspension.errors.alreadySuspended,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("keeps the dialog open to retry when saving fails", async () => {
      vi.mocked(suspendUser).mockRejectedValue(new Error("network"));
      renderScreen();
      const { user, dialog } = await openSwitch("Enzo Morales");
      await user.click(
        within(dialog).getByRole("radio", {
          name: suspension.durations.oneDay,
        }),
      );
      await user.click(
        within(dialog).getByRole("radio", { name: suspension.reasons.spam }),
      );
      await user.click(
        within(dialog).getByRole("button", {
          name: suspension.confirm.suspend,
        }),
      );

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        suspension.failed,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(
        within(dialog).getByRole("radio", { name: suspension.reasons.spam }),
      ).toBeChecked();
    });

    it("cancels without saving", async () => {
      renderScreen();
      const { user, dialog } = await openSwitch("Enzo Morales");

      await user.click(
        within(dialog).getByRole("button", { name: suspension.cancel }),
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(suspendUser).not.toHaveBeenCalled();
    });
  });
});
