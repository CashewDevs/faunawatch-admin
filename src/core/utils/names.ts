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

/** Name fields from a `profiles` row. */
export interface ProfileNames {
  fullName: string | null;
  username: string | null;
  displayName: string | null;
}

function nonBlank(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Name to show for a person: full name, then username, then the legacy
 * display name, then the part of the email before the "@".
 */
export function getProfileDisplayName(
  names: ProfileNames,
  email: string | null,
): string | null {
  return (
    nonBlank(names.fullName) ??
    nonBlank(names.username) ??
    nonBlank(names.displayName) ??
    nonBlank(email?.split("@")[0] ?? null)
  );
}
