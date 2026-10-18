import { describe, expect, it } from "vitest";
import {
  formatCoordinates,
  formatDate,
  formatDateTime,
  formatMonthYear,
  formatNumber,
  formatRelativeTime,
} from "./formatters";

describe("formatters", () => {
  it("formats numbers with thousands separators", () => {
    expect(formatNumber(1420)).toBe("1,420");
    expect(formatNumber(34)).toBe("34");
  });

  it("formats ISO dates as short dates with a two-digit day", () => {
    expect(formatDate("2023-09-12")).toBe("Sep 12, 2023");
    expect(formatDate("2023-11-03")).toBe("Nov 03, 2023");
  });

  it("formats month and year", () => {
    expect(formatMonthYear("2023-11-03")).toBe("Nov 2023");
  });

  it("formats a date and 24-hour time in the given time zone", () => {
    expect(formatDateTime("2024-10-24T11:40:00Z", "Asia/Manila")).toBe(
      "Oct 24, 2024 • 19:40",
    );
  });

  it("formats elapsed time relative to now", () => {
    const now = new Date("2026-10-18T12:00:00Z");
    expect(formatRelativeTime("2026-10-18T11:59:40Z", now)).toBe("just now");
    expect(formatRelativeTime("2026-10-18T11:36:00Z", now)).toBe("24m ago");
    expect(formatRelativeTime("2026-10-18T09:00:00Z", now)).toBe("3h ago");
    expect(formatRelativeTime("2026-10-13T12:00:00Z", now)).toBe("5d ago");
    expect(formatRelativeTime("2026-08-01T12:00:00Z", now)).toBe(
      "Aug 01, 2026",
    );
  });

  it("formats coordinates with hemispheres", () => {
    expect(formatCoordinates(10.1248, 123.6391)).toBe(
      "10.1248° N, 123.6391° E",
    );
    expect(formatCoordinates(-33.86, -70.5)).toBe("33.8600° S, 70.5000° W");
  });
});
