import {
  countPostsByTab,
  getQueuePosition,
  queryPosts,
  type PostCounts,
  type PostDetail,
  type PostListQuery,
  type PostPage,
  type PostQueuePosition,
} from "../models/post";
import { mockPostDetails, mockPosts } from "./mockPosts";

/**
 * Posts Service: loads posts for review, their counts per status, and a
 * single post with its comments, reporter stats, and AI analysis.
 *
 * TODO(schema): Currently serves in-memory mock data. Replace with Supabase
 * queries (tab/search/filters/sort and range-based pagination done
 * server-side, count queries per status, and a detail query joining the
 * reporter, comments, and stored AI fields) once the reports schema, its
 * moderation status column, and the admin RLS policies are defined by the
 * mobile app/backend. Map rows to the post Models here.
 */

const mockLatencyMs = 300;

function withMockLatency<T>(value: T): Promise<T> {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve(value);
    }, mockLatencyMs),
  );
}

export function fetchPosts(query: PostListQuery): Promise<PostPage> {
  return withMockLatency(queryPosts(mockPosts, query));
}

export function fetchPostCounts(): Promise<PostCounts> {
  return withMockLatency(countPostsByTab(mockPosts));
}

/** Resolves to null when no post has this id. */
export function fetchPost(postId: string): Promise<PostDetail | null> {
  return withMockLatency(
    mockPostDetails.find((post) => post.id === postId) ?? null,
  );
}

/** Resolves to null when no post has this id. */
export function fetchPostQueuePosition(
  postId: string,
): Promise<PostQueuePosition | null> {
  return withMockLatency(getQueuePosition(mockPosts, postId));
}
