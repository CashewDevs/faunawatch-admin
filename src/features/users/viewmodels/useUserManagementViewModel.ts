import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { useDebouncedValue } from "../../../core/hooks/useDebouncedValue";
import {
  getPageCount,
  getPageItems,
  getPageRange,
} from "../../../core/utils/pagination";
import {
  defaultUserListQuery,
  getActiveRate,
  type UserListQuery,
  type UserRole,
  type UserSortOption,
  type UserStatusFilter,
} from "../models/adminUser";
import {
  fetchUserStats,
  fetchUsers,
  updateUserRole,
} from "../services/usersService";

export const searchDebounceMs = 300;

/**
 * Presentation state and actions for the User Management screen: search,
 * status filter, sort, pagination, the summary statistics, and role changes.
 */
export function useUserManagementViewModel() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState(defaultUserListQuery.search);
  const [status, setStatus] = useState<UserStatusFilter>(
    defaultUserListQuery.status,
  );
  const [sort, setSort] = useState<UserSortOption>(defaultUserListQuery.sort);
  const [page, setPage] = useState(defaultUserListQuery.page);
  const [pageSize, setPageSize] = useState(defaultUserListQuery.pageSize);
  const search = useDebouncedValue(searchInput, searchDebounceMs);

  const query: UserListQuery = { search, status, sort, page, pageSize };

  const usersQuery = useQuery({
    queryKey: ["users", "list", query],
    queryFn: () => fetchUsers(query),
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: ["users", "stats"],
    queryFn: fetchUserStats,
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateUserRole(userId, role),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["users", "list"] }),
  });

  const totalCount = usersQuery.data?.totalCount ?? 0;
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

  const changeRole = (userId: string, role: UserRole) => {
    roleMutation.mutate({ userId, role });
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
    users: usersQuery.data?.users ?? [],
    totalCount,
    pageCount,
    pageItems: getPageItems(page, pageCount),
    pageRange: getPageRange(page, pageSize, totalCount),
    isLoading: usersQuery.isPending,
    isError: usersQuery.isError,
    retry: () => void usersQuery.refetch(),
    stats: statsQuery.data,
    activeRate: statsQuery.data ? getActiveRate(statsQuery.data) : 0,
    /** User whose role change is in flight, if any. */
    updatingRoleUserId: roleMutation.isPending
      ? roleMutation.variables.userId
      : undefined,
    isRoleUpdateError: roleMutation.isError,
    changeSearch,
    changeStatus,
    changeSort,
    changePageSize,
    goToPage,
    changeRole,
    exportCsv,
  };
}

export type UserManagementViewModel = ReturnType<
  typeof useUserManagementViewModel
>;
