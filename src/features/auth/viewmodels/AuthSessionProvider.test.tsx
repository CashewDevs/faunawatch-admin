import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthFailure,
  type SessionSource,
  type SessionUser,
} from "../models/authSession";
import {
  fetchAdminProfile,
  onSessionChange,
  signOut,
} from "../services/authService";
import { AuthSessionProvider } from "./AuthSessionProvider";
import { useAuthSession } from "./authSessionContext";

vi.mock("../services/authService", () => ({
  onSessionChange: vi.fn(),
  fetchAdminProfile: vi.fn(),
  signOut: vi.fn(),
}));

type Listener = (user: SessionUser | null, source: SessionSource) => void;

const user = { id: "user-1", email: "admin@example.org" };
const admin = { id: "user-1", displayName: "Maria Santos" };

let listener: Listener = () => undefined;
let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>{children}</AuthSessionProvider>
    </QueryClientProvider>
  );
}

function renderSession() {
  return renderHook(() => useAuthSession(), { wrapper });
}

function emit(nextUser: SessionUser | null, source: SessionSource) {
  act(() => {
    listener(nextUser, source);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient();
  vi.mocked(onSessionChange).mockImplementation((callback) => {
    listener = callback;
    return () => undefined;
  });
  vi.mocked(signOut).mockResolvedValue();
});

describe("AuthSessionProvider", () => {
  it("is loading until the saved session is known", () => {
    const { result } = renderSession();

    expect(result.current.status).toBe("loading");
    expect(result.current.admin).toBeNull();
  });

  it("is signed out when there is no saved session", () => {
    const { result } = renderSession();
    emit(null, "restored");

    expect(result.current.status).toBe("signedOut");
    expect(fetchAdminProfile).not.toHaveBeenCalled();
  });

  it("restores an admin session", async () => {
    vi.mocked(fetchAdminProfile).mockResolvedValue(admin);
    const { result } = renderSession();
    emit(user, "restored");

    expect(result.current.status).toBe("loading");
    await waitFor(() => {
      expect(result.current.status).toBe("signedIn");
    });
    expect(result.current.admin).toEqual(admin);
    expect(fetchAdminProfile).toHaveBeenCalledWith(user);
  });

  it("signs out a restored session that is not an admin", async () => {
    vi.mocked(fetchAdminProfile).mockResolvedValue(null);
    const { result } = renderSession();
    emit(user, "restored");

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
    expect(result.current.status).toBe("signedOut");
  });

  it("fails closed when the admin check errors", async () => {
    vi.mocked(fetchAdminProfile).mockRejectedValue(new AuthFailure("network"));
    const { result } = renderSession();
    emit(user, "restored");

    await waitFor(() => {
      expect(result.current.status).toBe("signedOut");
    });
    expect(result.current.admin).toBeNull();
  });

  it("is verifying, not loading, while a new sign-in is checked", () => {
    vi.mocked(fetchAdminProfile).mockReturnValue(new Promise(() => undefined));
    const { result } = renderSession();
    emit(null, "restored");
    emit(user, "changed");

    expect(result.current.status).toBe("verifying");
  });

  it("clears cached data when the session ends", async () => {
    vi.mocked(fetchAdminProfile).mockResolvedValue(admin);
    queryClient.setQueryData(["users"], ["cached"]);
    const { result } = renderSession();
    emit(user, "restored");
    await waitFor(() => {
      expect(result.current.status).toBe("signedIn");
    });

    emit(null, "changed");

    expect(result.current.status).toBe("signedOut");
    expect(queryClient.getQueryData(["users"])).toBeUndefined();
  });

  it("signs out through the auth service", async () => {
    const { result } = renderSession();
    emit(null, "restored");

    await act(async () => {
      await result.current.signOut();
    });

    expect(signOut).toHaveBeenCalled();
  });
});

describe("useAuthSession", () => {
  it("throws outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => renderHook(() => useAuthSession())).toThrow(
      "useAuthSession must be used inside AuthSessionProvider.",
    );
  });
});
