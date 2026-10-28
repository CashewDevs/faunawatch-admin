/**
 * Auth domain model: the signed-in user, the admin profile shown in the
 * header, and the sign-in failures the login screen can explain.
 */

/** The account behind the current Supabase session. */
export interface SessionUser {
  id: string;
  email: string | null;
}

/** A signed-in user confirmed as an admin by the backend. */
export interface AdminProfile {
  id: string;
  /** Null when the profile and email give no usable name. */
  displayName: string | null;
}

/** Name fields from the `profiles` row. */
export interface ProfileNames {
  fullName: string | null;
  username: string | null;
  displayName: string | null;
}

/**
 * - loading: restoring a saved session on page load.
 * - verifying: a new sign-in is being checked for admin access.
 * - signedOut / signedIn: settled; signedIn means the backend confirmed admin.
 */
export type SessionStatus = "loading" | "verifying" | "signedOut" | "signedIn";

/** How the current session user was reported. */
export type SessionSource = "restored" | "changed";

export type AuthErrorKind =
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "rateLimited"
  | "network"
  | "notAdmin"
  | "unknown";

/** A sign-in or session failure, already translated from Supabase errors. */
export class AuthFailure extends Error {
  readonly kind: AuthErrorKind;

  constructor(kind: AuthErrorKind) {
    super(`Auth failure: ${kind}`);
    this.name = "AuthFailure";
    this.kind = kind;
  }
}

export interface SessionSnapshot {
  /** Undefined until the saved session has been read. */
  user: SessionUser | null | undefined;
  source: SessionSource;
  /** The admin check has not finished yet. */
  isChecking: boolean;
  /** The admin check failed (e.g. network). Treated as signed out. */
  isCheckFailed: boolean;
  /** The admin check result: null means "not an admin". */
  profile: AdminProfile | null | undefined;
}

/** Fail-closed: anything short of a confirmed admin is not signed in. */
export function getSessionStatus(snapshot: SessionSnapshot): SessionStatus {
  if (snapshot.user === undefined) return "loading";
  if (snapshot.user === null || snapshot.isCheckFailed) return "signedOut";
  if (snapshot.isChecking) {
    return snapshot.source === "restored" ? "loading" : "verifying";
  }
  return snapshot.profile ? "signedIn" : "signedOut";
}

export function getAuthErrorKind(error: unknown): AuthErrorKind {
  return error instanceof AuthFailure ? error.kind : "unknown";
}

function nonBlank(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Name to show for the admin: full name, then username, then the legacy
 * display name, then the part of the email before the "@".
 */
export function getAdminDisplayName(
  names: ProfileNames,
  email: string | null,
): string | null {
  return (
    nonBlank(names.fullName) ??
    nonBlank(names.username) ??
    nonBlank(names.displayName) ??
    nonBlank(email?.split("@")[0] ?? null)
  );
}
