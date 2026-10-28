/**
 * Pure helpers for profile avatars, which the mobile app stores in
 * `profiles.avatar_path` as either a preset (`preset:bunny`) or a path in
 * the private avatars bucket (`{user_id}/{filename}`).
 */

/** The mobile app's preset avatars, copied into src/assets/shared/avatars/. */
export const presetAvatarNames = [
  "panda",
  "bunny",
  "tweety",
  "garfield",
  "ice",
  "snoop",
  "jerry",
  "perry",
  "grizz",
] as const;

export type PresetAvatarName = (typeof presetAvatarNames)[number];

/** An avatar ready to show: a preset image, or a signed photo URL. */
export type AvatarImage =
  { kind: "preset"; name: PresetAvatarName } | { kind: "photo"; url: string };

/** What `avatar_path` points at, before any photo URL is signed. */
export type StoredAvatar =
  { kind: "preset"; name: PresetAvatarName } | { kind: "upload"; path: string };

function toPresetName(name: string): PresetAvatarName | null {
  return presetAvatarNames.find((preset) => preset === name) ?? null;
}

/**
 * Reads `avatar_path` the way the mobile app does: `preset:<name>` or an
 * app asset path (`assets/images/<name>.webp`) is a preset; any other
 * value is an uploaded photo. Unknown presets give no avatar.
 */
export function parseAvatarPath(path: string | null): StoredAvatar | null {
  const value = path?.trim();
  if (!value) return null;
  if (value.startsWith("preset:")) {
    const name = toPresetName(value.slice("preset:".length));
    return name ? { kind: "preset", name } : null;
  }
  if (value.startsWith("assets/")) {
    const fileName = value.split("/").at(-1) ?? "";
    const name = toPresetName(fileName.split(".")[0] ?? "");
    return name ? { kind: "preset", name } : null;
  }
  return { kind: "upload", path: value };
}
