import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { isRequestChangesEnabled } from "../../../core/constants/featureFlags";
import { useDebouncedValue } from "../../../core/hooks/useDebouncedValue";
import {
  getPageCount,
  getPageItems,
  getPageRange,
} from "../../../core/utils/pagination";
import {
  countPostsByTab,
  defaultPostListQuery,
  getPostTabs,
  hasActiveFilters,
  parsePostListParams,
  queryPosts,
  toPostListParams,
  type PostCardData,
  type Filter,
  type PostListQuery,
  type PostSeverity,
  type PostSortOption,
  type PostTab,
  type ReportCategory,
} from "../models/post";
import { isDecidable } from "../models/moderation";
import { fetchPostCardMedia } from "../services/postsService";
import { allPostsQuery, signedUrlStaleTimeMs } from "./postQueries";
import { useModerationFlow } from "./useModerationFlow";

export const searchDebounceMs = 300;

/**
 * Presentation state and actions for the Post Approvals list: status tab,
 * search, filters, sort, pagination (all kept in the URL), and the card
 * selection behind the bulk-action bar.
 */
export function usePostApprovalsViewModel() {
  const [params, setParams] = useSearchParams();
  // "Changes requested" is offered (and read from the URL) only while
  // Request changes is on; its posts still show under "All Posts".
  const tabs = getPostTabs(isRequestChangesEnabled());
  const urlQuery = parsePostListParams(params, tabs);
  const search = useDebouncedValue(urlQuery.search, searchDebounceMs);
  const query: PostListQuery = { ...urlQuery, search };

  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const moderation = useModerationFlow({
    onDecided: () => {
      setCheckedIds(new Set());
    },
  });

  const postsQuery = useQuery(allPostsQuery);
  const allPosts = postsQuery.data;
  const result = allPosts ? queryPosts(allPosts, query) : undefined;
  const pagePosts = result?.posts ?? [];
  const pageIds = pagePosts.map((post) => post.id);

  // Only this page's cover photos and avatars are signed.
  const mediaQuery = useQuery({
    queryKey: ["posts", "media", pageIds],
    queryFn: () => fetchPostCardMedia(pagePosts),
    enabled: pagePosts.length > 0,
    staleTime: signedUrlStaleTimeMs,
  });
  const mediaById = new Map(
    (mediaQuery.data ?? []).map((card) => [card.id, card]),
  );
  const posts: PostCardData[] = pagePosts.map(
    (post) =>
      mediaById.get(post.id) ?? {
        ...post,
        coverUrl: null,
        reporterAvatar: null,
      },
  );
  // Only pending posts can be selected. A post decided since it was
  // checked (here or by another admin) drops out once the list reloads.
  const decidableIds = new Set(
    (allPosts ?? [])
      .filter((post) => isDecidable(post.status))
      .map((post) => post.id),
  );
  const selectedIds: ReadonlySet<string> = new Set(
    [...checkedIds].filter((id) => decidableIds.has(id)),
  );
  const decidableOnPage = posts.filter((post) => isDecidable(post.status));

  const totalCount = result?.totalCount ?? 0;
  const pageCount = getPageCount(totalCount, urlQuery.pageSize);

  /** Merges a change into the URL; every change but paging returns to page 1. */
  const update = (
    patch: Partial<PostListQuery>,
    options?: { replace?: boolean },
  ) => {
    const next = { ...urlQuery, page: 1, ...patch };
    setParams(toPostListParams(next), { replace: options?.replace });
  };

  const changeTab = (tab: PostTab) => {
    setCheckedIds(new Set());
    update({ tab });
  };

  const goToPage = (page: number) => {
    update({ page: Math.min(Math.max(1, page), pageCount) });
  };

  const toggleSelection = (postId: string) => {
    if (!decidableIds.has(postId)) return;
    setCheckedIds(() => {
      const next = new Set(selectedIds);
      if (!next.delete(postId)) next.add(postId);
      return next;
    });
  };

  const allOnPageSelected =
    decidableOnPage.length > 0 &&
    decidableOnPage.every((post) => selectedIds.has(post.id));

  /** Selects every pending post on this page, or clears the whole selection once they all are. */
  const toggleSelectAll = () => {
    setCheckedIds(() => {
      if (allOnPageSelected) return new Set();
      const next = new Set(selectedIds);
      decidableOnPage.forEach((post) => next.add(post.id));
      return next;
    });
  };

  // TODO(moderation): Whether declining should notify the reporter is
  // still open; the app doesn't show decisions yet (Cliff's area).
  const approvePost = (postId: string) => {
    moderation.open("approve", [postId]);
  };
  const declinePost = (postId: string) => {
    moderation.open("decline", [postId]);
  };
  const approveSelected = () => {
    moderation.open("approve", [...selectedIds]);
  };
  const declineSelected = () => {
    moderation.open("decline", [...selectedIds]);
  };

  return {
    tab: urlQuery.tab,
    tabs,
    searchInput: urlQuery.search,
    severity: urlQuery.severity,
    category: urlQuery.category,
    sort: urlQuery.sort,
    page: urlQuery.page,
    pageSize: urlQuery.pageSize,
    posts,
    totalCount,
    pageCount,
    pageItems: getPageItems(urlQuery.page, pageCount),
    pageRange: getPageRange(urlQuery.page, urlQuery.pageSize, totalCount),
    counts: allPosts ? countPostsByTab(allPosts) : undefined,
    isLoading: postsQuery.isPending,
    isError: postsQuery.isError,
    retry: () => void postsQuery.refetch(),
    hasActiveFilters: hasActiveFilters(urlQuery),
    selectedIds,
    selectedCount: selectedIds.size,
    allOnPageSelected,
    moderation,
    changeTab,
    changeSearch: (value: string) => {
      update({ search: value }, { replace: true });
    },
    changeSeverity: (value: Filter<PostSeverity>) => {
      update({ severity: value });
    },
    changeCategory: (value: Filter<ReportCategory>) => {
      update({ category: value });
    },
    changeSort: (value: PostSortOption) => {
      update({ sort: value });
    },
    clearFilters: () => {
      update({
        severity: defaultPostListQuery.severity,
        category: defaultPostListQuery.category,
      });
    },
    changePageSize: (value: number) => {
      update({ pageSize: value });
    },
    goToPage,
    toggleSelection,
    toggleSelectAll,
    approvePost,
    declinePost,
    approveSelected,
    declineSelected,
  };
}

export type PostApprovalsViewModel = ReturnType<
  typeof usePostApprovalsViewModel
>;
