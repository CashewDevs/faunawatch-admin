import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../../core/constants/appRoutes";
import {
  getReturnPath,
  isSafeReturnPath,
  readReturnTo,
  toReturnPathState,
} from "./returnPath";

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

  it("uses a path saved before a Google sign-in when state has none", () => {
    expect(getReturnPath(null, "/analytics?range=90d")).toBe(
      "/analytics?range=90d",
    );
    // Router state wins over the saved path.
    expect(getReturnPath({ returnTo: "/posts" }, "/analytics")).toBe("/posts");
    // A saved path is validated like any other.
    expect(getReturnPath(null, "//evil.example")).toBe(AppRoutes.users);
    expect(getReturnPath({ returnTo: "//evil.example" }, "/posts")).toBe(
      "/posts",
    );
  });
});

describe("return path helpers", () => {
  it("reads returnTo from router state", () => {
    expect(readReturnTo({ returnTo: "/posts" })).toBe("/posts");
    expect(readReturnTo("nope")).toBeUndefined();
    expect(readReturnTo(null)).toBeUndefined();
  });

  it("accepts only same-site paths other than login", () => {
    expect(isSafeReturnPath("/users?page=2")).toBe(true);
    expect(isSafeReturnPath("users")).toBe(false);
    expect(isSafeReturnPath(`${AppRoutes.login}?next=1`)).toBe(false);
    expect(isSafeReturnPath(undefined)).toBe(false);
  });
});
