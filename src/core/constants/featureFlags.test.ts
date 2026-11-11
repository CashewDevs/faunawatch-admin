import { afterEach, describe, expect, it, vi } from "vitest";
import { isRequestChangesEnabled } from "./featureFlags";

describe("isRequestChangesEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off by default", () => {
    vi.stubEnv("VITE_ENABLE_REQUEST_CHANGES", "");
    expect(isRequestChangesEnabled()).toBe(false);
  });

  it("only turns on for exactly 'true' in development", () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_ENABLE_REQUEST_CHANGES", "true");
    expect(isRequestChangesEnabled()).toBe(true);

    vi.stubEnv("VITE_ENABLE_REQUEST_CHANGES", "1");
    expect(isRequestChangesEnabled()).toBe(false);
  });

  it("ignores the variable in a production build", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_ENABLE_REQUEST_CHANGES", "true");
    expect(isRequestChangesEnabled()).toBe(false);
  });
});
