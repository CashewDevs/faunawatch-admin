/**
 * Change requests: an admin sends a pending post back to the reporter with
 * a message and ticks for what to fix (`admin_request_changes`), and can
 * take the request back while the reporter hasn't resubmitted
 * (`admin_withdraw_change_request`). A request is not a decision: the post
 * moves between pending and changes_requested and no review is recorded.
 * See the faunawatch repo's migration add_report_change_requests.
 */

import type { PostStatus } from "./post";

/** What the admin can tick as needing a fix. */
export type ChangeField =
  "photos" | "speciesDescription" | "location" | "category";

export const changeFields: readonly ChangeField[] = [
  "photos",
  "speciesDescription",
  "location",
  "category",
];

/** `report_change_field` enum values, by key. */
const changeFieldValues: Record<ChangeField, string> = {
  photos: "photos",
  speciesDescription: "species_description",
  location: "location",
  category: "category",
};

/** A key to its `report_change_field` enum value. */
export function toChangeFieldValue(field: ChangeField): string {
  return changeFieldValues[field];
}

/** `report_change_field` to its key; null for a value this site doesn't know. */
export function toChangeField(value: string): ChangeField | null {
  return (
    changeFields.find((field) => changeFieldValues[field] === value) ?? null
  );
}

/** The database's limit on the message, after trimming. */
export const changeRequestMessageMaxLength = 500;

/** The message as it will be saved: surrounding whitespace dropped. */
export function normalizeChangeRequestMessage(message: string): string {
  return message.trim();
}

/** Whether a draft has something to send and fits the limit. */
export function isChangeRequestMessageValid(message: string): boolean {
  const text = normalizeChangeRequestMessage(message);
  return text !== "" && text.length <= changeRequestMessageMaxLength;
}

/** The fields in display order, each once. */
export function sortChangeFields(
  fields: readonly ChangeField[],
): ChangeField[] {
  return changeFields.filter((field) => fields.includes(field));
}

/** How a request was closed; null while it is open. */
export type ChangeRequestResolution = "resubmitted" | "withdrawn";

export function toChangeRequestResolution(
  value: string | null,
): ChangeRequestResolution | null {
  return value === "resubmitted" || value === "withdrawn" ? value : null;
}

/** One round of the back-and-forth with the reporter. */
export interface ChangeRequest {
  id: string;
  /** 1 for the first request on a post, 2 for the next, and so on. */
  round: number;
  message: string;
  fields: readonly ChangeField[];
  /** ISO 8601 date-time. */
  requestedAt: string;
  /** Null when the admin's account was deleted, or they have no name. */
  requestedByName: string | null;
  isRequestedByFormerAdmin: boolean;
  /** Null while the request is open. */
  resolution: ChangeRequestResolution | null;
  /** ISO 8601 date-time; null while the request is open. */
  resolvedAt: string | null;
  /** The admin who withdrew it; the reporter's name is never shown. */
  withdrawnByName: string | null;
  isWithdrawnByFormerAdmin: boolean;
}

/** Newest round first. */
export function sortChangeRequests(
  requests: readonly ChangeRequest[],
): ChangeRequest[] {
  return [...requests].sort((a, b) => b.round - a.round);
}

/** What the admin is doing: sending a post back, or taking that back. */
export type ChangeRequestAction = "request" | "withdraw";

/** Only pending posts can be sent back. */
export function canRequestChanges(status: PostStatus): boolean {
  return status === "pending";
}

/** Only a post waiting for the reporter can have its request withdrawn. */
export function canWithdrawChangeRequest(status: PostStatus): boolean {
  return status === "changes_requested";
}

/**
 * Why a change failed:
 * - `notPending`: the post is no longer pending (decided or already sent back).
 * - `notAwaitingChanges`: the reporter resubmitted, or another admin withdrew it.
 * - `notFound`: the post no longer exists.
 * - `forbidden`: the account isn't an admin any more.
 * - `invalidInput`: the server refused the message (22023); fixable in the dialog.
 * - `failed`: anything else, e.g. the network.
 */
export type ChangeRequestErrorKind =
  | "notPending"
  | "notAwaitingChanges"
  | "notFound"
  | "forbidden"
  | "invalidInput"
  | "failed";

/**
 * A Postgres/PostgREST error to its kind. FW409 says which rule was broken
 * in its message; without one, the action tells (a request can only hit
 * report_not_pending, a withdraw only report_not_awaiting_changes).
 */
export function toChangeRequestErrorKind(
  action: ChangeRequestAction,
  code: string | undefined,
  message?: string,
): ChangeRequestErrorKind {
  if (code === "FW404") return "notFound";
  if (code === "42501") return "forbidden";
  // Only a request carries a message; a withdraw has nothing to fix.
  if (code === "22023" && action === "request") return "invalidInput";
  if (code === "FW409") {
    if (message?.includes("report_not_awaiting_changes")) {
      return "notAwaitingChanges";
    }
    if (message?.includes("report_not_pending")) return "notPending";
    return action === "request" ? "notPending" : "notAwaitingChanges";
  }
  return "failed";
}

/** A change the server rejected, or that never reached it. */
export class ChangeRequestError extends Error {
  readonly kind: ChangeRequestErrorKind;

  constructor(kind: ChangeRequestErrorKind, options?: ErrorOptions) {
    super(`Couldn't change the request (${kind}).`, options);
    this.name = "ChangeRequestError";
    this.kind = kind;
  }
}

/** The kind of any error thrown while requesting or withdrawing. */
export function getChangeRequestErrorKind(
  error: unknown,
): ChangeRequestErrorKind {
  return error instanceof ChangeRequestError ? error.kind : "failed";
}
