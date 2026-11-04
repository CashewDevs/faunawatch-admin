import { isAuthError, isAuthRetryableFetchError } from "@supabase/supabase-js";
import { AppRoutes } from "../../../core/constants/appRoutes";
import {
  clearSessionPersistence,
  setSessionPersistence,
} from "../../../core/services/authStorage";
import { supabase } from "../../../core/services/supabaseClient";
import type { SessionUser } from "../models/authSession";
import {
  PasswordResetFailure,
  type PasswordResetErrorKind,
  type RecoveryArrival,
} from "../models/passwordReset";

/**
 * Supabase Auth access for the forgot and reset password screens. Raw
 * Supabase errors are translated to PasswordResetFailure and never shown or
 * logged.
 *
 * A reset link comes in one of two forms. Supabase's default email links
 * through Supabase, which uses up the token and returns here with a one-time
 * code that only works in the browser that asked. A custom template (which
 * needs custom SMTP on the free plan) links here directly with the token, and
 * works in any browser.
 */

const resetErrorKinds: Partial<Record<string, PasswordResetErrorKind>> = {
  // Supabase uses this one code for made-up, used and expired links.
  otp_expired: "linkInvalid",
  flow_state_expired: "linkInvalid",
  flow_state_not_found: "linkInvalid",
  bad_code_verifier: "linkInvalid",
  pkce_code_verifier_not_found: "otherBrowser",
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
 * Emails a reset link that comes back to this site. Supabase responds the
 * same way when the email has no account, and sends nothing.
 *
 * The default link needs a secret this browser saves now. The email opens in
 * a new tab, so the secret must not be kept in this tab only.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  setSessionPersistence(true);
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${AppRoutes.resetPassword}`,
    });
    if (error) throw toPasswordResetFailure(error);
  } finally {
    clearSessionPersistence();
  }
}

/** Set while this tab holds a session opened by a reset link. Not a token. */
const recoveryFlagKey = "faunawatch-admin.recovery-in-progress";

/**
 * How this page was reached. Supabase reports a bad default link in the URL,
 * after either the "?" or the "#". The error text is never shown: anyone can
 * craft that link.
 */
export function readRecoveryArrival(): RecoveryArrival {
  const { search, hash } = window.location;
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.slice(1));

  const tokenHash = fragment.get("token_hash");
  if (tokenHash) return { kind: "token", tokenHash };
  const code = query.get("code");
  if (code) return { kind: "code", code };
  const hasError = [query, fragment].some(
    (params) => params.has("error") || params.has("error_code"),
  );
  if (hasError) return { kind: "failed" };
  return window.sessionStorage.getItem(recoveryFlagKey) === null
    ? { kind: "none" }
    : { kind: "resume" };
}

/** Removes the link's details from the address bar and browser history. */
export function clearRecoveryUrl(): void {
  window.history.replaceState(
    window.history.state,
    "",
    window.location.pathname,
  );
}

function startRecovery(user: { id: string; email?: string }): SessionUser {
  window.sessionStorage.setItem(recoveryFlagKey, "true");
  return { id: user.id, email: user.email ?? null };
}

/** Call when a reset finishes or is refused, before signing out. */
export function endRecovery(): void {
  window.sessionStorage.removeItem(recoveryFlagKey);
}

/**
 * Uses a custom template link's token, which signs this browser in as the
 * account. The session is kept in this tab only and ends when the browser
 * closes.
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
  return startRecovery(data.user);
}

async function exchangeCode(code: string): Promise<SessionUser> {
  setSessionPersistence(false);
  // Reads the flow id from the URL, so the URL is only cleared afterwards.
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  clearRecoveryUrl();
  if (error) {
    clearSessionPersistence();
    throw toPasswordResetFailure(error);
  }
  return startRecovery(data.user);
}

let codeExchange: Promise<SessionUser> | null = null;

/**
 * Uses a default link's one-time code, which signs this browser in as the
 * account, in this tab only. Runs once per page load, because a second try
 * would fail: React runs a screen's first effect twice in development.
 */
export function exchangeRecoveryCode(code: string): Promise<SessionUser> {
  codeExchange ??= exchangeCode(code);
  return codeExchange;
}

/** Test-only: allow another exchange. */
export function resetCodeExchangeForTests(): void {
  codeExchange = null;
}

/**
 * The account of a reset already under way in this tab, e.g. after a reload.
 * Null if its session has ended.
 */
export async function resumeRecoverySession(): Promise<SessionUser | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    endRecovery();
    return null;
  }
  const { id, email } = data.session.user;
  return { id, email: email ?? null };
}

/** Sets the signed-in account's new password. */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw toPasswordResetFailure(error);
}
