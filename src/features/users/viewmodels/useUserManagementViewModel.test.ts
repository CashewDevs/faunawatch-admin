import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testUsers } from "../../../test/fixtures/users";
import { createQueryWrapper } from "../../../test/queryWrapper";
import { fetchSanctionsSince, fetchUsers } from "../services/usersService";
import { useUserManagementViewModel } from "./useUserManagementViewModel";

vi.mock("../services/usersService", () => ({
  fetchUsers: vi.fn(),
  fetchSanctionsSince: vi.fn(),
}));

const fetchUsersMock = vi.mocked(fetchUsers);
const fetchSanctionsMock = vi.mocked(fetchSanctionsSince);

function renderViewModel() {
  return renderHook(() => useUserManagementViewModel(), {
    wrapper: createQueryWrapper(),
  });
}

describe("useUserManagementViewModel", () => {
  beforeEach(() => {
    fetchUsersMock.mockReset();
    fetchSanctionsMock.mockReset();
    fetchUsersMock.mockResolvedValue([...testUsers]);
    fetchSanctionsMock.mockResolvedValue([
      { userId: "test-user-4", createdAt: new Date().toISOString() },
    ]);
  });

  it("loads the first page and the stats", async () => {
    const { result } = renderViewModel();
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.users).toHaveLength(10);
    expect(result.current.totalCount).toBe(testUsers.length);
    expect(result.current.pageRange).toEqual({ from: 1, to: 10 });
    expect(result.current.pageCount).toBe(3);

    await waitFor(() => {
      expect(result.current.stats).toBeDefined();
    });
    expect(result.current.stats).toMatchObject({
      totalUsers: 24,
      activeUsers: 22,
      suspendedUsers: 2,
      suspendedThisMonth: 1,
    });
    expect(result.current.activeRate).toBe(91.7);
    expect(fetchUsersMock).toHaveBeenCalledTimes(1);
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
    // Filtering happens on the loaded list; nothing is refetched.
    expect(fetchUsersMock).toHaveBeenCalledTimes(1);
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
});
