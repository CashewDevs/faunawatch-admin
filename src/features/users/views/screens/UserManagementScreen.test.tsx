import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppStrings } from "../../../../core/constants/appStrings";
import { testUsers } from "../../../../test/fixtures/users";
import { createQueryWrapper } from "../../../../test/queryWrapper";
import { fetchSanctionsSince, fetchUsers } from "../../services/usersService";
import { UserManagementScreen } from "./UserManagementScreen";

vi.mock("../../services/usersService", () => ({
  fetchUsers: vi.fn(),
  fetchSanctionsSince: vi.fn(),
}));

const strings = AppStrings.users;

function renderScreen() {
  return render(<UserManagementScreen />, { wrapper: createQueryWrapper() });
}

describe("UserManagementScreen", () => {
  beforeEach(() => {
    vi.mocked(fetchUsers).mockResolvedValue([...testUsers]);
    vi.mocked(fetchSanctionsSince).mockResolvedValue([]);
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
    vi.mocked(fetchUsers).mockRejectedValueOnce(new Error("network"));
    renderScreen();

    expect(await screen.findByRole("alert")).toHaveTextContent(strings.error);
    expect(
      screen.getByRole("button", { name: strings.retry }),
    ).toBeInTheDocument();
  });

  it("renders status switches as disabled for now", async () => {
    renderScreen();
    await screen.findByText("Enzo Morales");

    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(10);
    switches.forEach((toggle) => expect(toggle).toBeDisabled());
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
    vi.mocked(fetchUsers).mockResolvedValue([
      {
        ...first,
        fullName: "",
        username: null,
        email: null,
        avatar: { kind: "preset", name: "panda" },
      },
    ]);
    const { container } = renderScreen();

    expect(await screen.findByText(strings.table.unnamed)).toBeInTheDocument();
    expect(screen.getByText(strings.table.noEmail)).toBeInTheDocument();
    expect(container.querySelector('img[src*="panda"]')).not.toBeNull();
  });
});
