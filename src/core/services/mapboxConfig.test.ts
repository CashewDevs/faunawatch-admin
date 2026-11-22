import { describe, expect, it } from "vitest";
import { getMapboxToken } from "./mapboxConfig";

describe("getMapboxToken", () => {
  it("accepts a public token, trimmed", () => {
    expect(getMapboxToken(" pk.abc123 ")).toBe("pk.abc123");
  });

  // Not getMapboxToken(undefined): that falls back to the real env, which
  // Vitest loads from a local .env.
  it("returns null when the token is blank", () => {
    expect(getMapboxToken("")).toBeNull();
    expect(getMapboxToken("   ")).toBeNull();
  });

  it("refuses secret or unknown tokens so they never reach the browser", () => {
    expect(getMapboxToken("sk.secret")).toBeNull();
    expect(getMapboxToken("your-mapbox-public-token")).toBeNull();
  });
});
