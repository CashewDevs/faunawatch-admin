import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  testUserCounts,
  testUserPage,
  testUsers,
} from "../../../test/fixtures/users";
import { createQueryWrapper } from "../../../test/queryWrapper";
import {
  fetchSanctionsSince,
  fetchUserCounts,
  fetchUserPage,
} from "../services/usersService";
import { useUserManagementViewModel } from "./useUserManagementViewModel";

vi.mock("../services/usersService", () => ({
  fetchUserPage: vi.fn(),
  fetchUserCounts: vi.fn(),
  fetchSanctionsSince: vi.fn(),
}));

const fetchUserPageMock = vi.mocked(fetchUserPage);
const fetchUserCountsMock = vi.mocked(fetchUserCounts);
const fetchSanctionsMock = vi.mocked(fetchSanctionsSince);

function renderViewModel() {
  return renderHook(() => useUserManagementViewModel(), {
    wrapper: createQueryWrapper(),
  });
}

async function renderLoaded() {
  const rendered = renderViewModel();
  await waitFor(() => {
    expect(rendered.result.current.isLoading).toBe(false);
  });
  return rendered;
}

describe("useUserManagementViewModel", () => {
  beforeEach(() => {
    fetchUserPageMock.mockReset();
    fetchUserCountsMock.mockReset();
    fetchSanctionsMock.mockReset();
    fetchUserPageMock.mockImplementation((query) =>
      Promise.resolve(testUserPage(query)),
    );
    fetchUserCountsMock.mockResolvedValue(testUserCounts);
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
    expect(fetchUserPageMock).toHaveBeenCalledWith({
      search: "",
      status: "all",
      sort: "newest",
      page: 1,
      pageSize: 10,
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
  });

  it("loads each page from the server", async () => {
    const { result } = await renderLoaded();

    act(() => {
      result.current.goToPage(3);
    });

    expect(result.current.page).toBe(3);
    await waitFor(() => {
      expect(result.current.users).toHaveLength(4);
    });
    expect(fetchUserPageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 3, pageSize: 10 }),
    );
    expect(result.current.pageRange).toEqual({ from: 21, to: 24 });
  });

  it("keeps the current page visible while the next one loads", async () => {
    const { result } = await renderLoaded();
    const firstPage = result.current.users;
    fetchUserPageMock.mockReturnValue(new Promise(() => undefined));

    act(() => {
      result.current.goToPage(2);
    });

    await waitFor(() => {
      expect(fetchUserPageMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.users).toEqual(firstPage);
    expect(result.current.totalCount).toBe(testUsers.length);
  });

  it("filters by status on the server and resets to page 1", async () => {
    const { result } = await renderLoaded();

    act(() => {
      result.current.goToPage(2);
    });
    act(() => {
      result.current.changeStatus("suspended");
    });

    expect(result.current.page).toBe(1);
    await waitFor(() => {
      expect(result.current.totalCount).toBe(2);
    });
    expect(result.current.users.every((u) => u.status === "suspended")).toBe(
      true,
    );
    expect(fetchUserPageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "suspended", page: 1 }),
    );
  });

  it("sorts on the server and resets to page 1", async () => {
    const { result } = await renderLoaded();

    act(() => {
      result.current.goToPage(2);
    });
    act(() => {
      result.current.changeSort("name");
    });

    expect(result.current.page).toBe(1);
    await waitFor(() => {
      expect(fetchUserPageMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: "name", page: 1 }),
      );
    });
  });

  it("debounces search and sends the trimmed term once", async () => {
    const { result } = await renderLoaded();
    fetchUserPageMock.mockClear();

    act(() => {
      result.current.changeSearch("k");
    });
    act(() => {
      result.current.changeSearch(" klip ");
    });
    expect(result.current.searchInput).toBe(" klip ");

    await waitFor(() => {
      expect(result.current.totalCount).toBe(1);
    });
    expect(result.current.users[0]?.username).toBe("klip123");
    expect(fetchUserPageMock).toHaveBeenCalledTimes(1);
    expect(fetchUserPageMock).toHaveBeenCalledWith(
      expect.objectContaining({ search: "klip", page: 1 }),
    );
  });

  it("keeps page navigation within bounds", async () => {
    const { result } = await renderLoaded();

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
    const { result } = await renderLoaded();

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

  it("returns to page 1 when the open page no longer exists", async () => {
    const { result } = await renderLoaded();
    // Users were removed elsewhere: the last page is now past the end.
    fetchUserPageMock.mockImplementation((query) =>
      Promise.resolve(testUserPage(query, testUsers.slice(0, 15))),
    );

    act(() => {
      result.current.goToPage(3);
    });

    await waitFor(() => {
      expect(result.current.page).toBe(1);
    });
    await waitFor(() => {
      expect(result.current.totalCount).toBe(15);
    });
    expect(result.current.users).toHaveLength(10);
  });

  it("exposes the error state and retries", async () => {
    fetchUserPageMock.mockRejectedValueOnce(new Error("network"));
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
    await waitFor(() => {
      expect(result.current.users).toHaveLength(10);
    });
  });
});
