import {
  isAuthApiError,
  isAuthRetryableFetchError,
} from "@supabase/supabase-js";
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
 * The callback must not call Supabase itself (supabase-js can deadlock);
 * callers react to the user change and fetch data afterwards.
 */
export function onSessionChange(
  callback: (user: SessionUser | null, source: SessionSource) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(
      session
        ? { id: session.user.id, email: session.user.email ?? null }
        : null,
      event === "INITIAL_SESSION" ? "restored" : "changed",
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
