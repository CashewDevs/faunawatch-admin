import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryUsers } from "../models/adminUser";
import { mockUserStats, mockUsers } from "../services/mockUsers";
import {
  fetchUserStats,
  fetchUsers,
  updateUserRole,
} from "../services/usersService";
import { createQueryWrapper } from "../../../test/queryWrapper";
import { useUserManagementViewModel } from "./useUserManagementViewModel";

vi.mock("../services/usersService", () => ({
  fetchUsers: vi.fn(),
  fetchUserStats: vi.fn(),
  updateUserRole: vi.fn(),
}));

const fetchUsersMock = vi.mocked(fetchUsers);
const fetchUserStatsMock = vi.mocked(fetchUserStats);

function renderViewModel() {
  return renderHook(() => useUserManagementViewModel(), {
    wrapper: createQueryWrapper(),
  });
}

describe("useUserManagementViewModel", () => {
  beforeEach(() => {
    fetchUsersMock.mockReset();
    fetchUserStatsMock.mockReset();
    fetchUsersMock.mockImplementation((query) =>
      Promise.resolve(queryUsers(mockUsers, query)),
    );
    fetchUserStatsMock.mockResolvedValue(mockUserStats);
  });

  it("loads the first page and the stats", async () => {
    const { result } = renderViewModel();
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.users).toHaveLength(10);
    expect(result.current.totalCount).toBe(mockUsers.length);
    expect(result.current.pageRange).toEqual({ from: 1, to: 10 });
    expect(result.current.pageCount).toBe(3);

    await waitFor(() => {
      expect(result.current.stats).toEqual(mockUserStats);
    });
    expect(result.current.activeRate).toBe(97.6);
  });

  it("filters by status and resets to page 1", async () => {
    const { result } = renderViewModel();
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.goToPage(2);
    });
    act(() => {
      result.current.changeStatus("suspended");
    });

    expect(result.current.page).toBe(1);
    await waitFor(() => {
      expect(result.current.users.every((u) => u.status === "suspended")).toBe(
        true,
      );
    });
    expect(result.current.totalCount).toBe(2);
  });

  it("debounces search before querying", async () => {
    const { result } = renderViewModel();
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.changeSearch("klip");
    });
    expect(result.current.searchInput).toBe("klip");

    await waitFor(() => {
      expect(result.current.totalCount).toBe(1);
    });
    expect(result.current.users[0]?.username).toBe("klip123");
    expect(fetchUsersMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "klip", page: 1 }),
    );
  });

  it("keeps page navigation within bounds", async () => {
    const { result } = renderViewModel();
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.goToPage(99);
    });
    expect(result.current.page).toBe(3);
    act(() => {
      result.current.goToPage(0);
    });
    expect(result.current.page).toBe(1);
  });

  it("changing page size returns to page 1", async () => {
    const { result } = renderViewModel();
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.goToPage(2);
    });
    act(() => {
      result.current.changePageSize(25);
    });
    expect(result.current.page).toBe(1);
    await waitFor(() => {
      expect(result.current.users).toHaveLength(24);
    });
    expect(result.current.pageCount).toBe(1);
  });

  it("exposes the error state and retries", async () => {
    fetchUsersMock.mockRejectedValueOnce(new Error("network"));
    const { result } = renderViewModel();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(false);
    });
    expect(result.current.users).toHaveLength(10);
  });

  it("changes a user's role and reloads the list", async () => {
    const enzo = mockUsers.find((user) => user.username === "enzo_m");
    if (!enzo) throw new Error("fixture missing");
    vi.mocked(updateUserRole).mockResolvedValue({ ...enzo, role: "admin" });
    const { result } = renderViewModel();
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    const callsBefore = fetchUsersMock.mock.calls.length;

    act(() => {
      result.current.changeRole(enzo.id, "admin");
    });

    await waitFor(() => {
      expect(fetchUsersMock.mock.calls.length).toBeGreaterThan(callsBefore);
    });
    expect(vi.mocked(updateUserRole)).toHaveBeenCalledWith(enzo.id, "admin");
    expect(result.current.isRoleUpdateError).toBe(false);
  });

  it("reports a failed role change", async () => {
    vi.mocked(updateUserRole).mockRejectedValue(new Error("forbidden"));
    const { result } = renderViewModel();
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.changeRole("mock-user-1", "admin");
    });

    await waitFor(() => {
      expect(result.current.isRoleUpdateError).toBe(true);
    });
  });
});
