/**
 * URL helpers for rendering untrusted URLs (e.g. user-submitted photos).
 */

/**
 * The URL when it is safe to use as a link: http(s), or a path on this
 * site. Anything else (javascript:, data:, …) returns undefined.
 */
export function toSafeLinkUrl(
  url: string,
  baseUrl: string = window.location.origin,
): string | undefined {
  try {
    const parsed = new URL(url, baseUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}
