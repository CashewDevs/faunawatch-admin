import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setSessionPersistence } from "../../../core/services/authStorage";
import { AuthFailure } from "../models/authSession";
import {
  fetchAdminProfile,
  getOAuthRedirectFailure,
  onSessionChange,
  resetOAuthRedirectFailureForTests,
  signIn,
  signInWithGoogle,
  signOut,
  toAuthFailure,
} from "./authService";

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  initialize: vi.fn(),
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
  resetOAuthRedirectFailureForTests();
  window.history.replaceState(null, "", "/");
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

describe("signInWithGoogle", () => {
  it("applies the remember-me choice and redirects back to the login screen", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null });

    await signInWithGoogle(true);

    expect(vi.mocked(setSessionPersistence)).toHaveBeenCalledWith(true);
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login` },
    });
  });

  it("applies the remember-me choice before starting the redirect", async () => {
    auth.signInWithOAuth.mockImplementation(() => {
      expect(vi.mocked(setSessionPersistence)).toHaveBeenCalledWith(false);
      return Promise.resolve({ data: {}, error: null });
    });

    await signInWithGoogle(false);

    expect(auth.signInWithOAuth).toHaveBeenCalled();
  });

  it("throws a translated failure", async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: {},
      error: new AuthRetryableFetchError("offline", 0),
    });

    await expect(signInWithGoogle(false)).rejects.toEqual(
      new AuthFailure("network"),
    );
  });
});

describe("getOAuthRedirectFailure", () => {
  it("returns null without waiting for supabase-js on a normal page load", async () => {
    window.history.replaceState(null, "", "/login?tab=x");

    await expect(getOAuthRedirectFailure()).resolves.toBeNull();

    expect(auth.initialize).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?tab=x");
  });

  it("reports a redirect error from the query string and cleans the URL", async () => {
    const state = { usr: null, key: "k", idx: 0 };
    window.history.replaceState(
      state,
      "",
      "/login?error=access_denied&error_code=x&error_description=Denied&tab=x",
    );
    auth.initialize.mockResolvedValue({ error: new Error("from URL") });

    await expect(getOAuthRedirectFailure()).resolves.toEqual(
      new AuthFailure("oauthFailed"),
    );

    expect(window.location.pathname).toBe("/login");
    expect(window.location.search).toBe("?tab=x");
    expect(window.history.state).toEqual(state);
  });

  it("reports a redirect error from the URL hash and cleans it", async () => {
    window.history.replaceState(
      null,
      "",
      "/login#error=server_error&error_description=Oops",
    );
    auth.initialize.mockResolvedValue({ error: new Error("from URL") });

    await expect(getOAuthRedirectFailure()).resolves.toEqual(
      new AuthFailure("oauthFailed"),
    );

    expect(window.location.hash).toBe("");
  });

  it("reports a failed code exchange and removes the code", async () => {
    window.history.replaceState(null, "", "/login?code=abc&sb_flow_id=f1");
    auth.initialize.mockResolvedValue({
      error: new AuthApiError("bad code", 400, "flow_state_not_found"),
    });

    await expect(getOAuthRedirectFailure()).resolves.toEqual(
      new AuthFailure("oauthFailed"),
    );

    expect(window.location.search).toBe("");
  });

  it("reports a network failure during the code exchange as network", async () => {
    window.history.replaceState(null, "", "/login?code=abc");
    auth.initialize.mockResolvedValue({
      error: new AuthRetryableFetchError("offline", 0),
    });

    await expect(getOAuthRedirectFailure()).resolves.toEqual(
      new AuthFailure("network"),
    );
  });

  it("returns null after a successful code exchange", async () => {
    window.history.replaceState(null, "", "/login?code=abc");
    auth.initialize.mockResolvedValue({ error: null });

    await expect(getOAuthRedirectFailure()).resolves.toBeNull();
  });

  it("reads the URL only once per page load", async () => {
    window.history.replaceState(null, "", "/login?error=access_denied");
    auth.initialize.mockResolvedValue({ error: new Error("from URL") });

    const first = await getOAuthRedirectFailure();
    const second = await getOAuthRedirectFailure();

    expect(second).toBe(first);
    expect(auth.initialize).toHaveBeenCalledTimes(1);
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

  it("reports the first event as restored even when SIGNED_IN comes first", () => {
    let listener: (event: string, session: unknown) => void = () => undefined;
    auth.onAuthStateChange.mockImplementation((callback) => {
      listener = callback as typeof listener;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    const callback = vi.fn();
    const session = { user: { id: "user-1", email: "admin@example.org" } };

    onSessionChange(callback);
    listener("SIGNED_IN", session);
    listener("INITIAL_SESSION", session);
    listener("TOKEN_REFRESHED", session);

    expect(callback).toHaveBeenNthCalledWith(1, user, "restored");
    expect(callback).toHaveBeenNthCalledWith(2, user, "restored");
    expect(callback).toHaveBeenNthCalledWith(3, user, "changed");
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
