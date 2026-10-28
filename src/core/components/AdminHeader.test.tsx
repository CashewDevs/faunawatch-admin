import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminProfile } from "../../features/auth/models/authSession";
import { useAuthSession } from "../../features/auth/viewmodels/authSessionContext";
import { AppRoutes, postDetailPath } from "../constants/appRoutes";
import { AppStrings } from "../constants/appStrings";
import { AdminHeader } from "./AdminHeader";

vi.mock("../../features/auth/viewmodels/authSessionContext", () => ({
  useAuthSession: vi.fn(),
}));

const signOut = vi.fn();

function setAdmin(admin: AdminProfile | null) {
  vi.mocked(useAuthSession).mockReturnValue({
    status: "signedIn",
    admin,
    signOut,
    rejection: null,
    clearRejection: vi.fn(),
  });
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminHeader />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  signOut.mockResolvedValue(undefined);
  setAdmin({ id: "user-1", displayName: "maria Santos" });
});

describe("AdminHeader", () => {
  it.each([
    [AppRoutes.users, AppStrings.users.heading],
    [AppRoutes.posts, AppStrings.posts.heading],
    [postDetailPath("mock-post-1042"), AppStrings.posts.heading],
    [AppRoutes.analytics, AppStrings.analytics.heading],
  ])("shows the page title for %s", (path, title) => {
    renderAt(path);

    expect(
      screen.getByRole("heading", { level: 1, name: title }),
    ).toBeInTheDocument();
  });

  it("shows the signed-in admin's name, initial and role", () => {
    renderAt(AppRoutes.users);

    expect(screen.getByText("maria Santos")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText(AppStrings.layout.profileRole)).toBeInTheDocument();
  });

  it("falls back to a generic name when the admin has none", () => {
    setAdmin({ id: "user-1", displayName: null });
    renderAt(AppRoutes.users);

    expect(
      screen.getByText(AppStrings.layout.profileFallbackName),
    ).toBeInTheDocument();
  });

  it("logs out through the session", async () => {
    const user = userEvent.setup();
    renderAt(AppRoutes.users);

    await user.click(
      screen.getByRole("button", { name: AppStrings.layout.logout }),
    );

    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
