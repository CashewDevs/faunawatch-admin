/** Mapbox's Standard style, the same one the mobile app's maps use. */
export const MAPBOX_STYLE_URL = "mapbox://styles/mapbox/standard";

/**
 * The Mapbox token for the browser, or null when maps can't be shown.
 *
 * Only public tokens (`pk.`) are accepted: anything sent to the browser is
 * readable by anyone, so a secret token (`sk.`) must never be used here.
 * The token should be an admin-only one, limited in the Mapbox dashboard to
 * the admin site's addresses.
 */
export function getMapboxToken(
  raw: string | undefined = import.meta.env.VITE_MAPBOX_TOKEN,
): string | null {
  const token = raw?.trim() ?? "";
  return token.startsWith("pk.") ? token : null;
}
