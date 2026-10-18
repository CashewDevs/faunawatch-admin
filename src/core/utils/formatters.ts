/**
 * Display formatters shared across the admin site.
 */

const numberFormatter = new Intl.NumberFormat("en-US");

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** 1420 → "1,420" */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** "2023-09-12" → "Sep 12, 2023" */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}
