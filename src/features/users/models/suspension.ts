/**
 * Suspending and reactivating users: how long a suspension lasts, the
 * reasons an admin picks from, and why the server refused a change.
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

export type SuspensionReason =
  | "spam"
  | "harassment"
  | "misleadingReports"
  | "inappropriateContent"
  | "other";

export const suspensionReasons: readonly SuspensionReason[] = [
  "spam",
  "harassment",
  "misleadingReports",
  "inappropriateContent",
  "other",
];

/** The database's limit on the stored reason. */
export const suspensionReasonMaxLength = 500;

/** Leaves room for the reason's label in front of the details. */
export const suspensionDetailsMaxLength = 400;

/** "Other" means nothing on its own, so it needs details. */
export function needsSuspensionDetails(reason: SuspensionReason): boolean {
  return reason === "other";
}

/**
 * The reason as stored and shown to the user: the label, then any details
 * ("Spam: posted ads"). "Other" stores the details alone.
 */
export function composeSuspensionReason(
  reason: SuspensionReason,
  label: string,
  details: string,
): string {
  const text = details.trim();
  if (needsSuspensionDetails(reason)) return text;
  return text ? `${label}: ${text}` : label;
}

/** Whether the chosen reason and details can be saved. */
export function isSuspensionReasonComplete(
  reason: SuspensionReason | null,
  details: string,
): boolean {
  if (!reason) return false;
  const text = details.trim();
  if (text.length > suspensionDetailsMaxLength) return false;
  return !needsSuspensionDetails(reason) || text !== "";
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
