import { describe, expect, it } from "vitest";
import { AppRoutes } from "../core/constants/appRoutes";
import { getReturnPath, toReturnPathState } from "./returnPath";

describe("getReturnPath", () => {
  it("returns the page the admin asked for, with its query string", () => {
    expect(getReturnPath(toReturnPathState("/posts", "?tab=approved"))).toBe(
      "/posts?tab=approved",
    );
  });

  it("falls back to the default screen without a saved path", () => {
    expect(getReturnPath(null)).toBe(AppRoutes.users);
    expect(getReturnPath({})).toBe(AppRoutes.users);
    expect(getReturnPath({ returnTo: 42 })).toBe(AppRoutes.users);
  });

  it("rejects paths that leave the site or loop back to login", () => {
    expect(getReturnPath({ returnTo: "https://evil.example" })).toBe(
      AppRoutes.users,
    );
    expect(getReturnPath({ returnTo: "//evil.example" })).toBe(AppRoutes.users);
    expect(getReturnPath({ returnTo: AppRoutes.login })).toBe(AppRoutes.users);
  });
});
