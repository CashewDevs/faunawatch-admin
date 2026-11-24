/**
 * One admin on the Admins page, from the database function
 * admin_list_admins() (faunawatch repo, migration
 * 20261124150000_add_admin_management.sql).
 */
export interface AdminMember {
  userId: string;
  email: string;
  /** Profile name, if one was ever set. */
  name: string | null;
  /** "invited" until they accept the invitation. */
  status: "active" | "invited";
  /** When the latest invitation was sent. */
  invitedAt: Date | null;
  lastSignInAt: Date | null;
  addedAt: Date | null;
  isYou: boolean;
}

/** A row of admin_list_admins(). */
export interface AdminMemberRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  status: string;
  invited_at: string | null;
  last_sign_in_at: string | null;
  added_at: string | null;
  is_you: boolean;
}

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toAdminMember(row: AdminMemberRow): AdminMember {
  return {
    userId: row.user_id,
    email: row.email ?? "",
    name: row.display_name?.trim() || null,
    status: row.status === "active" ? "active" : "invited",
    invitedAt: toDate(row.invited_at),
    lastSignInAt: toDate(row.last_sign_in_at),
    addedAt: toDate(row.added_at),
    isYou: row.is_you,
  };
}

/**
 * Supabase's email links (invitations too) last this long: its "Email OTP
 * Expiration" setting, 3600 seconds by default.
 */
export const inviteLifetimeMs = 60 * 60 * 1000;

/** Whether an invitation's link no longer works, so it needs resending. */
export function isInviteExpired(member: AdminMember, now: Date): boolean {
  if (member.status !== "invited" || !member.invitedAt) return false;
  return now.getTime() - member.invitedAt.getTime() >= inviteLifetimeMs;
}

/** Why an Admins page action failed; each has its own message. */
export type AdminActionErrorKind =
  | "notAllowed"
  | "invalidEmail"
  | "alreadyAdmin"
  | "alreadyInvited"
  | "hasAccount"
  | "notInvited"
  | "cannotRemoveYourself"
  | "lastAdmin"
  | "invitePending"
  | "notAdmin"
  | "rateLimited"
  | "network"
  | "unknown";

export class AdminActionError extends Error {
  readonly kind: AdminActionErrorKind;

  constructor(kind: AdminActionErrorKind, options?: { cause?: unknown }) {
    super(kind, options);
    this.name = "AdminActionError";
    this.kind = kind;
  }
}

export function getAdminActionErrorKind(error: unknown): AdminActionErrorKind {
  return error instanceof AdminActionError ? error.kind : "unknown";
}

/** manage-admins' error codes (see its README). */
const functionErrorKinds: Partial<Record<string, AdminActionErrorKind>> = {
  unauthorized: "notAllowed",
  not_admin: "notAllowed",
  invalid_email: "invalidEmail",
  already_admin: "alreadyAdmin",
  already_invited: "alreadyInvited",
  has_account: "hasAccount",
  not_invited: "notInvited",
  rate_limited: "rateLimited",
};

export function toFunctionErrorKind(code: unknown): AdminActionErrorKind {
  return (typeof code === "string" && functionErrorKinds[code]) || "unknown";
}

/** admin_remove_admin()'s errors: its message is the code. */
const removeErrorKinds: Partial<Record<string, AdminActionErrorKind>> = {
  cannot_remove_yourself: "cannotRemoveYourself",
  last_admin: "lastAdmin",
  invite_pending: "invitePending",
  not_an_admin: "notAdmin",
};

export function toRemoveErrorKind(error: {
  code?: string;
  message?: string;
}): AdminActionErrorKind {
  if (error.code === "42501") return "notAllowed";
  return (error.message && removeErrorKinds[error.message]) || "unknown";
}
