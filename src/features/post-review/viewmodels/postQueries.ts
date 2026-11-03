import { queryOptions } from "@tanstack/react-query";
import { signedUrlTtlSeconds } from "../../../core/services/storageService";
import { fetchAllPosts } from "../services/postsService";

/**
 * Every report. The list filters and pages it, and the review page takes
 * its place in the queue from it.
 */
export const allPostsQuery = queryOptions({
  queryKey: ["posts", "all"],
  queryFn: fetchAllPosts,
});

/**
 * Queries holding signed URLs stay fresh for half the URL lifetime, so
 * images aren't re-signed (and reloaded) on every focus, yet are re-signed
 * well before they expire.
 */
export const signedUrlStaleTimeMs = (signedUrlTtlSeconds * 1000) / 2;
