import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setSessionPersistence } from "../../../core/services/authStorage";
import { AuthFailure } from "../models/authSession";
import {
  fetchAdminProfile,
  onSessionChange,
  signIn,
  signOut,
  toAuthFailure,
} from "./authService";

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}));
const rpc = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());

vi.mock("../../../core/services/supabaseClient", () => ({
  supabase: { auth, rpc, from },
}));

vi.mock("../../../core/services/authStorage", () => ({
  setSessionPersistence: vi.fn(),
}));

const user = { id: "user-1", email: "admin@example.org" };

/** Mocks `from("profiles").select(...).eq(...).maybeSingle()`. */
function mockProfileQuery(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  from.mockReturnValue({ select });
  return { select, eq };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toAuthFailure", () => {
  it.each([
    [new AuthApiError("x", 400, "invalid_credentials"), "invalidCredentials"],
    [new AuthApiError("x", 400, "email_not_confirmed"), "emailNotConfirmed"],
    [new AuthApiError("x", 429, "over_request_rate_limit"), "rateLimited"],
    [new AuthApiError("x", 429, undefined), "rateLimited"],
    [new AuthApiError("x", 500, "unexpected_failure"), "unknown"],
    [new AuthRetryableFetchError("x", 0), "network"],
    [new Error("x"), "unknown"],
  ])("maps %o to %s", (error, kind) => {
    expect(toAuthFailure(error).kind).toBe(kind);
  });
});

describe("signIn", () => {
  it("applies the remember-me choice, trims the email and returns the user", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1", email: "admin@example.org" } },
      error: null,
    });

    await expect(
      signIn({ email: " admin@example.org ", password: "pw" }, false),
    ).resolves.toEqual(user);

    expect(vi.mocked(setSessionPersistence)).toHaveBeenCalledWith(false);
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.org",
      password: "pw",
    });
  });

  it("throws a translated failure", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError("Invalid login", 400, "invalid_credentials"),
    });

    await expect(
      signIn({ email: "a@b.co", password: "pw" }, true),
    ).rejects.toEqual(new AuthFailure("invalidCredentials"));
  });
});

describe("signOut", () => {
  it("signs out this browser only", async () => {
    auth.signOut.mockResolvedValue({ error: null });

    await signOut();

    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});

describe("onSessionChange", () => {
  it("reports the session user and unsubscribes", () => {
    const unsubscribe = vi.fn();
    let listener: (event: string, session: unknown) => void = () => undefined;
    auth.onAuthStateChange.mockImplementation((callback) => {
      listener = callback as typeof listener;
      return { data: { subscription: { unsubscribe } } };
    });
    const callback = vi.fn();

    const stop = onSessionChange(callback);
    listener("INITIAL_SESSION", {
      user: { id: "user-1", email: "admin@example.org" },
    });
    listener("SIGNED_OUT", null);
    stop();

    expect(callback).toHaveBeenNthCalledWith(1, user, "restored");
    expect(callback).toHaveBeenNthCalledWith(2, null, "changed");
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe("fetchAdminProfile", () => {
  it("returns null without reading the profile when the user is not an admin", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    await expect(fetchAdminProfile(user)).resolves.toBeNull();

    expect(rpc).toHaveBeenCalledWith("is_admin");
    expect(from).not.toHaveBeenCalled();
  });

  it("treats a non-boolean role result as not admin", async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await expect(fetchAdminProfile(user)).resolves.toBeNull();
  });

  it("returns the admin's name from their profile", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    const { select, eq } = mockProfileQuery({
      data: { full_name: "Maria Santos", username: null, display_name: null },
      error: null,
    });

    await expect(fetchAdminProfile(user)).resolves.toEqual({
      id: "user-1",
      displayName: "Maria Santos",
    });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith("full_name, username, display_name");
    expect(eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("falls back to the email when the profile row is missing", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    mockProfileQuery({ data: null, error: null });

    await expect(fetchAdminProfile(user)).resolves.toEqual({
      id: "user-1",
      displayName: "admin",
    });
  });

  it("throws when the role check fails", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "boom", code: "500" },
    });

    await expect(fetchAdminProfile(user)).rejects.toBeInstanceOf(AuthFailure);
  });
});
