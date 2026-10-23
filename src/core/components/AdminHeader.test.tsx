import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { AppRoutes, postDetailPath } from "../constants/appRoutes";
import { AppStrings } from "../constants/appStrings";
import { AdminHeader } from "./AdminHeader";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminHeader />
    </MemoryRouter>,
  );
}

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
});
