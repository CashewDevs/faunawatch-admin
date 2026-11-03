import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearReturnPath,
  loadReturnPath,
  saveReturnPath,
} from "./returnPathStorage";

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("returnPathStorage", () => {
  it("saves, loads, and clears the path for this tab", () => {
    expect(loadReturnPath()).toBeNull();

    saveReturnPath("/posts?tab=approved");
    expect(loadReturnPath()).toBe("/posts?tab=approved");
    // Reading doesn't consume it.
    expect(loadReturnPath()).toBe("/posts?tab=approved");

    clearReturnPath();
    expect(loadReturnPath()).toBeNull();
  });

  it("stays quiet when storage is blocked", () => {
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(blocked);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(blocked);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(blocked);

    expect(() => {
      saveReturnPath("/posts");
    }).not.toThrow();
    expect(loadReturnPath()).toBeNull();
    expect(() => {
      clearReturnPath();
    }).not.toThrow();
  });
});
