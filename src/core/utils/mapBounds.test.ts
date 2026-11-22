import { describe, expect, it } from "vitest";
import { getMapBounds } from "./mapBounds";

describe("getMapBounds", () => {
  it("is null without points", () => {
    expect(getMapBounds([])).toBeNull();
  });

  it("wraps every point", () => {
    expect(
      getMapBounds([
        { latitude: 10, longitude: 124 },
        { latitude: 8, longitude: 126 },
        { latitude: 12, longitude: 121 },
      ]),
    ).toEqual([
      [121, 8],
      [126, 12],
    ]);
  });

  it("is a single point for one point", () => {
    expect(getMapBounds([{ latitude: 9, longitude: 124 }])).toEqual([
      [124, 9],
      [124, 9],
    ]);
  });
});
