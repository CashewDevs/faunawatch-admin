import { describe, expect, it } from "vitest";
import { formatDate, formatNumber } from "./formatters";

describe("formatters", () => {
  it("formats numbers with thousands separators", () => {
    expect(formatNumber(1420)).toBe("1,420");
    expect(formatNumber(34)).toBe("34");
  });

  it("formats ISO dates as short dates with a two-digit day", () => {
    expect(formatDate("2023-09-12")).toBe("Sep 12, 2023");
    expect(formatDate("2023-11-03")).toBe("Nov 03, 2023");
  });
});
