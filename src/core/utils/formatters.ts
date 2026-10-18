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

const monthYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2023-09-12" → "Sep 12, 2023" */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

/** "2023-11-03" → "Nov 2023" */
export function formatMonthYear(isoDate: string): string {
  return monthYearFormatter.format(new Date(isoDate));
}

/**
 * "2024-10-24T11:40:00Z" → "Oct 24, 2024 • 19:40" in the given time zone
 * (the viewer's own by default).
 */
export function formatDateTime(isoDateTime: string, timeZone?: string): string {
  const date = new Date(isoDateTime);
  const day = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
  return `${day} • ${time}`;
}

/**
 * Short elapsed time: "just now", "24m ago", "3h ago", "5d ago", then the
 * date once it is over 30 days old.
 */
export function formatRelativeTime(isoDateTime: string, now: Date): string {
  const minutes = Math.floor(
    (now.getTime() - new Date(isoDateTime).getTime()) / 60_000,
  );
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${String(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)}h ago`;
  const days = Math.floor(hours / 24);
  if (days <= 30) return `${String(days)}d ago`;
  return formatDate(isoDateTime);
}

/** (10.1248, 123.6391) → "10.1248° N, 123.6391° E" */
export function formatCoordinates(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(4)}° ${latitude < 0 ? "S" : "N"}`;
  const lon = `${Math.abs(longitude).toFixed(4)}° ${longitude < 0 ? "W" : "E"}`;
  return `${lat}, ${lon}`;
}
