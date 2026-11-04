import { isAuthError, isAuthRetryableFetchError } from "@supabase/supabase-js";
import {
  clearSessionPersistence,
  setSessionPersistence,
} from "../../../core/services/authStorage";
import { supabase } from "../../../core/services/supabaseClient";
import type { SessionUser } from "../models/authSession";
import {
  PasswordResetFailure,
  type PasswordResetErrorKind,
} from "../models/passwordReset";

/**
 * Supabase Auth access for the reset-password screen. Raw Supabase errors
 * are translated to PasswordResetFailure and never shown or logged.
 */

const resetErrorKinds: Partial<Record<string, PasswordResetErrorKind>> = {
  // Supabase uses this one code for made-up, used and expired links.
  otp_expired: "linkInvalid",
  weak_password: "weakPassword",
  same_password: "samePassword",
};

export function toPasswordResetFailure(error: unknown): PasswordResetFailure {
  if (isAuthRetryableFetchError(error)) {
    return new PasswordResetFailure("network");
  }
  if (isAuthError(error)) {
    if (error.status === 429) return new PasswordResetFailure("rateLimited");
    return new PasswordResetFailure(
      (error.code && resetErrorKinds[error.code]) ?? "unknown",
    );
  }
  return new PasswordResetFailure("unknown");
}

/**
 * The token from the reset email's link, or null if there is none. It comes
 * after the "#" in the URL, so it is never sent to a server.
 */
export function readRecoveryToken(): string | null {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return params.get("token_hash") || null;
}

/** Removes the used token from the address bar and browser history. */
export function clearRecoveryToken(): void {
  window.history.replaceState(
    window.history.state,
    "",
    window.location.pathname,
  );
}

/**
 * Uses the link's token, which signs this browser in as the account. The
 * session is kept in this tab only and ends when the browser closes.
 */
export async function verifyRecoveryToken(
  tokenHash: string,
): Promise<SessionUser> {
  setSessionPersistence(false);
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });
  if (error || !data.user) {
    clearSessionPersistence();
    throw toPasswordResetFailure(error);
  }
  return { id: data.user.id, email: data.user.email ?? null };
}

/** Sets the signed-in account's new password. */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw toPasswordResetFailure(error);
}
