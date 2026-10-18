import { describe, expect, it } from "vitest";
import {
  getPageCount,
  getPageItems,
  getPageRange,
  paginate,
} from "./pagination";

describe("pagination helpers", () => {
  it("slices a 1-based page", () => {
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(paginate([1, 2, 3], 3, 2)).toEqual([]);
  });

  it("counts pages, with at least one", () => {
    expect(getPageCount(0, 10)).toBe(1);
    expect(getPageCount(21, 10)).toBe(3);
  });

  it("returns the shown item range", () => {
    expect(getPageRange(1, 10, 24)).toEqual({ from: 1, to: 10 });
    expect(getPageRange(3, 10, 24)).toEqual({ from: 21, to: 24 });
    expect(getPageRange(1, 10, 0)).toEqual({ from: 0, to: 0 });
  });

  it("lists every page when there are few", () => {
    expect(getPageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses gaps into ellipses", () => {
    expect(getPageItems(1, 16)).toEqual([1, 2, 3, "ellipsis", 16]);
    expect(getPageItems(8, 16)).toEqual([
      1,
      "ellipsis",
      7,
      8,
      9,
      "ellipsis",
      16,
    ]);
    expect(getPageItems(16, 16)).toEqual([1, "ellipsis", 14, 15, 16]);
  });
});
