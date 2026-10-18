/**
 * Pure helpers for people's display names.
 */

/** Up to two initials from a full name, e.g. "Klip Bautista" → "KB". */
export function getInitials(fullName: string): string {
  const words = fullName
    .split(/\s+/)
    .filter((word) => word && !word.endsWith("."));
  const letters = words.length > 1 ? [words[0], words.at(-1)] : words;
  return letters
    .map((word) => word?.charAt(0) ?? "")
    .join("")
    .toUpperCase();
}
