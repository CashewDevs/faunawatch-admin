import type { AvatarImage, StoredAvatar } from "../utils/avatars";
import { supabase } from "./supabaseClient";

/**
 * Signed URLs for files in the private storage buckets. Storage RLS lets
 * admins read every file; nobody else gets a URL from this site.
 */

export type StorageBucket = "avatars" | "report-images";

/** How long a signed URL works. Queries refetch well before this. */
export const signedUrlTtlSeconds = 60 * 60;

/**
 * Signs each path, returning a map from path to URL. Images are not
 * essential to reviewing, so a path that can't be signed is left out (the
 * View shows its fallback) rather than failing the whole screen.
 */
export async function createSignedUrls(
  bucket: StorageBucket,
  paths: readonly string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(unique, signedUrlTtlSeconds);
  if (error) return urls;

  for (const entry of data) {
    if (entry.path && entry.signedUrl && !entry.error) {
      urls.set(entry.path, entry.signedUrl);
    }
  }
  return urls;
}

/** Turns stored avatars into displayable ones, signing uploaded photos. */
export async function resolveAvatars(
  avatars: readonly (StoredAvatar | null)[],
): Promise<(AvatarImage | null)[]> {
  const uploadPaths = avatars.flatMap((avatar) =>
    avatar?.kind === "upload" ? [avatar.path] : [],
  );
  const urls = await createSignedUrls("avatars", uploadPaths);
  return avatars.map((avatar) => {
    if (!avatar) return null;
    if (avatar.kind === "preset") return avatar;
    const url = urls.get(avatar.path);
    return url ? { kind: "photo", url } : null;
  });
}
