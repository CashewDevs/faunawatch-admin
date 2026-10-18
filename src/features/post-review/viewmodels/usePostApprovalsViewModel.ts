import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { useDebouncedValue } from "../../../core/hooks/useDebouncedValue";
import {
  getPageCount,
  getPageItems,
  getPageRange,
} from "../../../core/utils/pagination";
import {
  defaultPostListQuery,
  hasActiveFilters,
  parsePostListParams,
  toPostListParams,
  type Filter,
  type PostListQuery,
  type PostRegion,
  type PostSeverity,
  type PostSortOption,
  type PostTab,
  type SpeciesCategory,
} from "../models/post";
import { fetchPostCounts, fetchPosts } from "../services/postsService";

export const searchDebounceMs = 300;

/**
 * Presentation state and actions for the Post Approvals list: status tab,
 * search, filters, sort, pagination (all kept in the URL), and the card
 * selection behind the bulk-action bar.
 */
export function usePostApprovalsViewModel() {
  const [params, setParams] = useSearchParams();
  const urlQuery = parsePostListParams(params);
  const search = useDebouncedValue(urlQuery.search, searchDebounceMs);
  const query: PostListQuery = { ...urlQuery, search };

  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const postsQuery = useQuery({
    queryKey: ["posts", "list", query],
    queryFn: () => fetchPosts(query),
    placeholderData: keepPreviousData,
  });

  const countsQuery = useQuery({
    queryKey: ["posts", "counts"],
    queryFn: fetchPostCounts,
  });

  const posts = postsQuery.data?.posts ?? [];
  const totalCount = postsQuery.data?.totalCount ?? 0;
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
    setSelectedIds(new Set());
    update({ tab });
  };

  const goToPage = (page: number) => {
    update({ page: Math.min(Math.max(1, page), pageCount) });
  };

  const toggleSelection = (postId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(postId)) next.add(postId);
      return next;
    });
  };

  const allOnPageSelected =
    posts.length > 0 && posts.every((post) => selectedIds.has(post.id));

  /** Selects every post on this page, or clears the whole selection once they all are. */
  const toggleSelectAll = () => {
    setSelectedIds((current) => {
      if (allOnPageSelected) return new Set();
      const next = new Set(current);
      posts.forEach((post) => next.add(post.id));
      return next;
    });
  };

  // TODO(moderation): Approve/decline need the reports moderation status
  // column, an admin-only RLS policy (or Edge Function), and a decision on
  // whether declining notifies the reporter. Visual only until then.
  const approvePost: (postId: string) => void = () => undefined;
  const declinePost: (postId: string) => void = () => undefined;
  const approveSelected = () => undefined;
  const declineSelected = () => undefined;

  return {
    tab: urlQuery.tab,
    searchInput: urlQuery.search,
    severity: urlQuery.severity,
    category: urlQuery.category,
    region: urlQuery.region,
    sort: urlQuery.sort,
    page: urlQuery.page,
    pageSize: urlQuery.pageSize,
    posts,
    totalCount,
    pageCount,
    pageItems: getPageItems(urlQuery.page, pageCount),
    pageRange: getPageRange(urlQuery.page, urlQuery.pageSize, totalCount),
    counts: countsQuery.data,
    isLoading: postsQuery.isPending,
    isError: postsQuery.isError,
    retry: () => void postsQuery.refetch(),
    hasActiveFilters: hasActiveFilters(urlQuery),
    selectedIds,
    selectedCount: selectedIds.size,
    allOnPageSelected,
    isModerationAvailable: false,
    changeTab,
    changeSearch: (value: string) => {
      update({ search: value }, { replace: true });
    },
    changeSeverity: (value: Filter<PostSeverity>) => {
      update({ severity: value });
    },
    changeCategory: (value: Filter<SpeciesCategory>) => {
      update({ category: value });
    },
    changeRegion: (value: Filter<PostRegion>) => {
      update({ region: value });
    },
    changeSort: (value: PostSortOption) => {
      update({ sort: value });
    },
    clearFilters: () => {
      update({
        severity: defaultPostListQuery.severity,
        category: defaultPostListQuery.category,
        region: defaultPostListQuery.region,
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
