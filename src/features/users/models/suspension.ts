/**
 * Suspending and reactivating users: how long a suspension lasts, the
 * reasons and levels an admin picks from, and why the server refused a
 * change.
 *
 * The database (`admin_suspend_user` / `admin_reactivate_user` in the
 * faunawatch repo) enforces the rules: admins can't be suspended, a user
 * has at most one active suspension, and only suspended users can be
 * reactivated. The site mirrors them so admins aren't offered a button
 * that can only fail.
 */

import type { AdminUser } from "./adminUser";

export type SuspensionAction = "suspend" | "reactivate";

export type SuspensionDuration =
  "oneDay" | "sevenDays" | "thirtyDays" | "untilReactivated";

export const suspensionDurations: readonly SuspensionDuration[] = [
  "oneDay",
  "sevenDays",
  "thirtyDays",
  "untilReactivated",
];

const daysByDuration: Record<SuspensionDuration, number | null> = {
  oneDay: 1,
  sevenDays: 7,
  thirtyDays: 30,
  untilReactivated: null,
};

/** Days the suspension lasts, or null until an admin reactivates the user. */
export function getSuspensionDays(duration: SuspensionDuration): number | null {
  return daysByDuration[duration];
}

/**
 * Why a user is suspended: the database's `suspension_category`. The app,
 * the in-app notification and the email show the same labels.
 */
export type SuspensionReason =
  | "spam"
  | "misleadingReports"
  | "inappropriateContent"
  | "harassment"
  | "hateOrThreats"
  | "scamOrImpersonation"
  | "other";

export const suspensionReasons: readonly SuspensionReason[] = [
  "spam",
  "misleadingReports",
  "inappropriateContent",
  "harassment",
  "hateOrThreats",
  "scamOrImpersonation",
  "other",
];

const reasonDbValues: Record<SuspensionReason, string> = {
  spam: "spam",
  misleadingReports: "misleading_reports",
  inappropriateContent: "inappropriate_content",
  harassment: "harassment",
  hateOrThreats: "hate_or_threats",
  scamOrImpersonation: "scam_or_impersonation",
  other: "other",
};

/** The `suspension_category` value saved for a reason. */
export function toSuspensionCategory(reason: SuspensionReason): string {
  return reasonDbValues[reason];
}

/** A stored category; null for suspensions made before categories. */
export function fromSuspensionCategory(
  value: string | null | undefined,
): SuspensionReason | null {
  return (
    suspensionReasons.find((reason) => reasonDbValues[reason] === value) ?? null
  );
}

/**
 * What a suspension takes away (`suspension_level`): restricted users can
 * browse the app but not post, comment, like, message or edit their
 * profile; locked users see only the suspension screen.
 */
export type SuspensionLevel = "restricted" | "locked";

export const suspensionLevels: readonly SuspensionLevel[] = [
  "restricted",
  "locked",
];

/** A stored level; null when unknown (e.g. not suspended). */
export function fromSuspensionLevel(
  value: string | null | undefined,
): SuspensionLevel | null {
  return value === "restricted" || value === "locked" ? value : null;
}

const presetLevels: Record<SuspensionReason, SuspensionLevel | null> = {
  spam: "restricted",
  misleadingReports: "restricted",
  inappropriateContent: "restricted",
  harassment: "locked",
  hateOrThreats: "locked",
  scamOrImpersonation: "locked",
  other: null,
};

/**
 * The level a reason starts with; the admin can change it. Null for Other,
 * where the admin must choose.
 */
export function getPresetLevel(
  reason: SuspensionReason,
): SuspensionLevel | null {
  return presetLevels[reason];
}

/** The database's limit on the admin's message to the user. */
export const suspensionMessageMaxLength = 500;

/** Whether a suspension's choices and message can be saved. */
export function isSuspensionComplete(choice: {
  duration: SuspensionDuration | null;
  reason: SuspensionReason | null;
  level: SuspensionLevel | null;
  message: string;
}): boolean {
  const text = choice.message.trim();
  return (
    choice.duration !== null &&
    choice.reason !== null &&
    choice.level !== null &&
    text !== "" &&
    text.length <= suspensionMessageMaxLength
  );
}

/** What the account switch does for this user. */
export function getSuspensionAction(user: AdminUser): SuspensionAction {
  return user.status === "suspended" ? "reactivate" : "suspend";
}

/**
 * Admins can't be suspended. A suspended admin (from data older than that
 * rule) can still be reactivated.
 */
export function canChangeSuspension(user: AdminUser): boolean {
  return user.status === "suspended" || !user.isAdmin;
}

export type SuspensionErrorKind =
  | "isAdmin"
  | "alreadySuspended"
  | "notSuspended"
  | "notFound"
  | "forbidden"
  | "failed";

/** A Postgres/PostgREST error code to its kind. */
export function toSuspensionErrorKind(
  code: string | undefined,
  action: SuspensionAction,
): SuspensionErrorKind {
  switch (code) {
    case "FW403":
      return "isAdmin";
    case "FW409":
      return action === "suspend" ? "alreadySuspended" : "notSuspended";
    case "FW404":
      return "notFound";
    case "42501":
      return "forbidden";
    default:
      return "failed";
  }
}

/** A suspend or reactivate the server rejected, or that never reached it. */
export class SuspensionError extends Error {
  readonly kind: SuspensionErrorKind;

  constructor(kind: SuspensionErrorKind, options?: ErrorOptions) {
    super(`Couldn't change the suspension (${kind}).`, options);
    this.name = "SuspensionError";
    this.kind = kind;
  }
}

/** The kind of any error thrown while suspending or reactivating. */
export function getSuspensionErrorKind(error: unknown): SuspensionErrorKind {
  return error instanceof SuspensionError ? error.kind : "failed";
}
