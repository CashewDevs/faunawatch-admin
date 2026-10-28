import {
  isAuthApiError,
  isAuthRetryableFetchError,
} from "@supabase/supabase-js";
import { AppRoutes } from "../../../core/constants/appRoutes";
import { setSessionPersistence } from "../../../core/services/authStorage";
import { supabase } from "../../../core/services/supabaseClient";
import type { LoginCredentials } from "../models/loginCredentials";
import {
  AuthFailure,
  getAdminDisplayName,
  type AdminProfile,
  type AuthErrorKind,
  type SessionSource,
  type SessionUser,
} from "../models/authSession";

/**
 * Supabase Auth access for the admin site. Returns auth Models only; raw
 * Supabase errors are translated to AuthFailure and never shown or logged.
 */

const authErrorKinds: Partial<Record<string, AuthErrorKind>> = {
  invalid_credentials: "invalidCredentials",
  email_not_confirmed: "emailNotConfirmed",
  over_request_rate_limit: "rateLimited",
};

export function toAuthFailure(error: unknown): AuthFailure {
  if (isAuthRetryableFetchError(error)) return new AuthFailure("network");
  if (isAuthApiError(error)) {
    if (error.status === 429) return new AuthFailure("rateLimited");
    return new AuthFailure(
      (error.code && authErrorKinds[error.code]) ?? "unknown",
    );
  }
  return new AuthFailure("unknown");
}

/**
 * Signs in with email and password and returns the signed-in user.
 * `remember` decides whether the session survives closing the browser.
 */
export async function signIn(
  { email, password }: LoginCredentials,
  remember: boolean,
): Promise<SessionUser> {
  setSessionPersistence(remember);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw toAuthFailure(error);
  return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * Starts Google sign-in. The whole page is redirected to Google and comes
 * back to the login screen, where supabase-js exchanges the returned code
 * for a session; this function never returns a user.
 * `remember` decides whether that session survives closing the browser.
 */
export async function signInWithGoogle(remember: boolean): Promise<void> {
  setSessionPersistence(remember);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}${AppRoutes.login}` },
  });
  if (error) throw toAuthFailure(error);
}

/** URL parameters a Google sign-in redirect can come back with. */
const oauthErrorParams = ["error", "error_code", "error_description"];
const oauthParams = [...oauthErrorParams, "code", "sb_flow_id"];

function oauthUrlParams(): { search: URLSearchParams; hash: URLSearchParams } {
  const url = new URL(window.location.href);
  return {
    search: url.searchParams,
    hash: new URLSearchParams(url.hash.slice(1)),
  };
}

/** Removes the sign-in redirect's parameters so a reload doesn't repeat it. */
function clearOAuthParams(): void {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  for (const key of oauthParams) {
    url.searchParams.delete(key);
    hash.delete(key);
  }
  url.hash = hash.toString();
  window.history.replaceState(window.history.state, "", url.toString());
}

async function readOAuthRedirectFailure(): Promise<AuthFailure | null> {
  const { search, hash } = oauthUrlParams();
  const hasError = oauthErrorParams.some(
    (key) => search.has(key) || hash.has(key),
  );
  const hasCode = search.has("code");
  if (!hasError && !hasCode) return null;

  // Let supabase-js read the URL and exchange the code before it is
  // cleaned. It leaves the URL alone when the redirect failed.
  let error: unknown;
  try {
    ({ error } = await supabase.auth.initialize());
  } catch (thrown) {
    error = thrown;
  }
  if (!hasError && !error) return null;

  clearOAuthParams();
  // The URL's error text is never shown: anyone can craft that link.
  if (hasError) return new AuthFailure("oauthFailed");
  const failure = toAuthFailure(error);
  return failure.kind === "network" ? failure : new AuthFailure("oauthFailed");
}

let oauthRedirectFailure: Promise<AuthFailure | null> | null = null;

/**
 * Why the Google sign-in redirect this page was loaded from failed, or
 * null if it didn't fail (or the page wasn't loaded from one). Read once
 * per page load; later calls return the same result.
 */
export function getOAuthRedirectFailure(): Promise<AuthFailure | null> {
  oauthRedirectFailure ??= readOAuthRedirectFailure();
  return oauthRedirectFailure;
}

/** Test-only: read the URL again on the next call. */
export function resetOAuthRedirectFailureForTests(): void {
  oauthRedirectFailure = null;
}

/**
 * Ends this browser's session only. The default global scope would also
 * sign the same account out of the mobile app.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: "local" });
}

/**
 * Listens for session changes, starting with the restored session (if any),
 * which is reported with source "restored". Returns a function that stops
 * listening.
 *
 * The first event always counts as "restored": after a Google sign-in
 * redirect, supabase-js sends INITIAL_SESSION and SIGNED_IN for the same
 * new session in either order.
 *
 * The callback must not call Supabase itself (supabase-js can deadlock);
 * callers react to the user change and fetch data afterwards.
 */
export function onSessionChange(
  callback: (user: SessionUser | null, source: SessionSource) => void,
): () => void {
  let isFirstEvent = true;
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    const source =
      isFirstEvent || event === "INITIAL_SESSION" ? "restored" : "changed";
    isFirstEvent = false;
    callback(
      session
        ? { id: session.user.id, email: session.user.email ?? null }
        : null,
      source,
    );
  });
  return () => {
    data.subscription.unsubscribe();
  };
}

interface ProfileNameRow {
  full_name: string | null;
  username: string | null;
  display_name: string | null;
}

/**
 * Returns the admin profile for the signed-in user, or null when the
 * backend says they are not an admin. The backend's is_admin() is the
 * source of truth; RLS enforces it on every admin query.
 */
export async function fetchAdminProfile(
  user: SessionUser,
): Promise<AdminProfile | null> {
  const role = await supabase.rpc("is_admin");
  if (role.error) throw toAuthFailure(role.error);
  const isAdmin: unknown = role.data;
  if (isAdmin !== true) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, username, display_name")
    .eq("id", user.id)
    .maybeSingle<ProfileNameRow>();
  if (error) throw toAuthFailure(error);

  return {
    id: user.id,
    displayName: getAdminDisplayName(
      {
        fullName: data?.full_name ?? null,
        username: data?.username ?? null,
        displayName: data?.display_name ?? null,
      },
      user.email,
    ),
  };
}
