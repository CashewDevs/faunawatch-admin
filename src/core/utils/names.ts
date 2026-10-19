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

export type AvatarTone = "primary" | "amber" | "teal";

const avatarTones: readonly AvatarTone[] = ["primary", "amber", "teal"];

/** Stable colour for an initials avatar, picked from the name. */
export function getAvatarTone(name: string): AvatarTone {
  let sum = 0;
  for (let index = 0; index < name.length; index += 1) {
    sum += name.charCodeAt(index);
  }
  return avatarTones[sum % avatarTones.length] ?? "primary";
}
