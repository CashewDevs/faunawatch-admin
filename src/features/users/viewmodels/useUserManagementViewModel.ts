import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useDebouncedValue } from "../../../core/hooks/useDebouncedValue";
import {
  getPageCount,
  getPageItems,
  getPageRange,
} from "../../../core/utils/pagination";
import {
  defaultUserListQuery,
  queryUsers,
  type UserListQuery,
  type UserSortOption,
  type UserStatusFilter,
} from "../models/adminUser";
import { allUsersQuery, useUserStats } from "./userQueries";

export const searchDebounceMs = 300;

/**
 * Presentation state and actions for the User Management screen: search,
 * status filter, sort, pagination, and the summary statistics.
 */
export function useUserManagementViewModel() {
  const [searchInput, setSearchInput] = useState(defaultUserListQuery.search);
  const [status, setStatus] = useState<UserStatusFilter>(
    defaultUserListQuery.status,
  );
  const [sort, setSort] = useState<UserSortOption>(defaultUserListQuery.sort);
  const [page, setPage] = useState(defaultUserListQuery.page);
  const [pageSize, setPageSize] = useState(defaultUserListQuery.pageSize);
  const search = useDebouncedValue(searchInput, searchDebounceMs);

  const usersQuery = useQuery(allUsersQuery);
  const { stats, activeRate } = useUserStats();

  const allUsers = usersQuery.data;
  const userPage = useMemo(() => {
    const query: UserListQuery = { search, status, sort, page, pageSize };
    return allUsers ? queryUsers(allUsers, query) : undefined;
  }, [allUsers, search, status, sort, page, pageSize]);

  const totalCount = userPage?.totalCount ?? 0;
  const pageCount = getPageCount(totalCount, pageSize);

  const changeSearch = (value: string) => {
    setSearchInput(value);
    setPage(1);
  };

  const changeStatus = (value: UserStatusFilter) => {
    setStatus(value);
    setPage(1);
  };

  const changeSort = (value: UserSortOption) => {
    setSort(value);
    setPage(1);
  };

  const changePageSize = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  const goToPage = (value: number) => {
    setPage(Math.min(Math.max(1, value), pageCount));
  };

  const exportCsv = () => {
    // TODO(export): CSV export is not specified yet (which columns, whether
    // emails may be exported, and whether it runs server-side). Decide
    // before implementing — the export contains personal user data.
  };

  return {
    searchInput,
    status,
    sort,
    page,
    pageSize,
    users: userPage?.users ?? [],
    totalCount,
    pageCount,
    pageItems: getPageItems(page, pageCount),
    pageRange: getPageRange(page, pageSize, totalCount),
    isLoading: usersQuery.isPending,
    isError: usersQuery.isError,
    retry: () => void usersQuery.refetch(),
    stats,
    activeRate,
    changeSearch,
    changeStatus,
    changeSort,
    changePageSize,
    goToPage,
    exportCsv,
  };
}

export type UserManagementViewModel = ReturnType<
  typeof useUserManagementViewModel
>;
