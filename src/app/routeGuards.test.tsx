import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../core/constants/appRoutes";
import { AppStrings } from "../core/constants/appStrings";
import type { SessionStatus } from "../features/auth/models/authSession";
import { useAuthSession } from "../features/auth/viewmodels/authSessionContext";
import { RedirectIfSignedIn, RequireAdmin } from "./routeGuards";

vi.mock("../features/auth/viewmodels/authSessionContext", () => ({
  useAuthSession: vi.fn(),
}));

function setStatus(status: SessionStatus) {
  vi.mocked(useAuthSession).mockReturnValue({
    status,
    admin: null,
    signOut: vi.fn(),
  });
}

/** Login and two admin pages behind the guards, starting at `path`. */
function appAt(path: string) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RedirectIfSignedIn />}>
          <Route path={AppRoutes.login} element={<p>Login page</p>} />
        </Route>
        <Route element={<RequireAdmin />}>
          <Route path={AppRoutes.users} element={<p>Users page</p>} />
          <Route path={AppRoutes.posts} element={<p>Posts page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function renderAt(path: string) {
  return render(appAt(path));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RequireAdmin", () => {
  it("shows admin pages to a signed-in admin", () => {
    setStatus("signedIn");
    renderAt(AppRoutes.posts);

    expect(screen.getByText("Posts page")).toBeInTheDocument();
  });

  it("sends signed-out visitors to the login screen", () => {
    setStatus("signedOut");
    renderAt(AppRoutes.posts);

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("shows the loading screen while the session is restored", () => {
    setStatus("loading");
    renderAt(AppRoutes.posts);

    expect(screen.getByRole("status")).toHaveTextContent(
      AppStrings.common.loading,
    );
    expect(screen.queryByText("Posts page")).not.toBeInTheDocument();
  });
});

describe("RedirectIfSignedIn", () => {
  it("shows the login screen when signed out", () => {
    setStatus("signedOut");
    renderAt(AppRoutes.login);

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("keeps the login screen mounted while a sign-in is verified", () => {
    setStatus("verifying");
    renderAt(AppRoutes.login);

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("sends a signed-in admin to the dashboard", () => {
    setStatus("signedIn");
    renderAt(AppRoutes.login);

    expect(screen.getByText("Users page")).toBeInTheDocument();
  });

  it("returns the admin to the page they asked for", () => {
    setStatus("signedOut");
    const { rerender } = renderAt(AppRoutes.posts);
    expect(screen.getByText("Login page")).toBeInTheDocument();

    // The router keeps its location (login, with the saved return path).
    setStatus("signedIn");
    rerender(appAt(AppRoutes.posts));

    expect(screen.getByText("Posts page")).toBeInTheDocument();
  });
});
