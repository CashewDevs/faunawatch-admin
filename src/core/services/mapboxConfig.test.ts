import { describe, expect, it } from "vitest";
import { getMapboxToken } from "./mapboxConfig";

describe("getMapboxToken", () => {
  it("accepts a public token, trimmed", () => {
    expect(getMapboxToken(" pk.abc123 ")).toBe("pk.abc123");
  });

  it("returns null when no token is set", () => {
    expect(getMapboxToken(undefined)).toBeNull();
    expect(getMapboxToken("")).toBeNull();
    expect(getMapboxToken("   ")).toBeNull();
  });

  it("refuses secret or unknown tokens so they never reach the browser", () => {
    expect(getMapboxToken("sk.secret")).toBeNull();
    expect(getMapboxToken("your-mapbox-public-token")).toBeNull();
  });
});
