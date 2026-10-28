import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyLoginCooldown } from "../models/loginCooldown";
import {
  loadLoginCooldown,
  onLoginCooldownChange,
  saveLoginCooldown,
} from "./loginCooldownStorage";

const key = "faunawatch-admin.login-cooldown";
const locked = { failures: 5, lastFailureAt: 1000, lockedUntil: 31_000 };

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("loginCooldownStorage", () => {
  it("starts with no cooldown", () => {
    expect(loadLoginCooldown()).toEqual(emptyLoginCooldown);
  });

  it("keeps the cooldown in localStorage so it survives a reload", () => {
    saveLoginCooldown(locked);

    expect(JSON.parse(window.localStorage.getItem(key) ?? "null")).toEqual(
      locked,
    );
    expect(loadLoginCooldown()).toEqual(locked);
  });

  it("removes the entry once there is nothing to remember", () => {
    saveLoginCooldown(locked);
    saveLoginCooldown(emptyLoginCooldown);

    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it("ignores a malformed stored value", () => {
    window.localStorage.setItem(key, "{not json");

    expect(loadLoginCooldown()).toEqual(emptyLoginCooldown);
  });

  it("keeps working when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => {
      saveLoginCooldown(locked);
    }).not.toThrow();
    expect(loadLoginCooldown()).toEqual(emptyLoginCooldown);
  });

  it("reports changes made in other tabs", () => {
    const callback = vi.fn();
    const stop = onLoginCooldownChange(callback);
    window.localStorage.setItem(key, JSON.stringify(locked));

    window.dispatchEvent(new StorageEvent("storage", { key: "other" }));
    window.dispatchEvent(new StorageEvent("storage", { key }));
    stop();
    window.dispatchEvent(new StorageEvent("storage", { key }));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(locked);
  });
});
