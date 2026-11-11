/**
 * Moderation domain model: the decisions an admin can make on a post, the
 * reasons for declining one, and what a failed decision means.
 *
 * A pending post can be approved or declined (`admin_decide_report`); an
 * approved post can be taken down, which declines it
 * (`admin_take_down_report`). Every other change is rejected, and a whole
 * batch is rejected if any post in it can't be decided. See the faunawatch
 * repo's migration separate_take_down_from_admin_decide_report.
 */

import type { PostStatus } from "./post";

export type ReviewDecision = "approved" | "declined";

/** What the admin is doing: approve, decline, or take down (decline an approved post). */
export type ModerationAction = "approve" | "decline" | "takeDown";

export type DeclineReason =
  | "inaccurateSpecies"
  | "lowQualityPhoto"
  | "domesticSpecimen"
  | "duplicateSighting"
  | "inaccurateLocation"
  | "inappropriateContent"
  | "notWildlife";

export const declineReasons: readonly DeclineReason[] = [
  "inaccurateSpecies",
  "lowQualityPhoto",
  "domesticSpecimen",
  "duplicateSighting",
  "inaccurateLocation",
  "inappropriateContent",
  "notWildlife",
];

/** `decline_reason` enum values, by key. */
const declineReasonValues: Record<DeclineReason, string> = {
  inaccurateSpecies: "inaccurate_species",
  lowQualityPhoto: "low_quality_photo",
  domesticSpecimen: "domestic_specimen",
  duplicateSighting: "duplicate",
  inaccurateLocation: "inaccurate_gps",
  inappropriateContent: "inappropriate_content",
  notWildlife: "not_wildlife",
};

const declineReasonByValue = new Map(
  declineReasons.map((reason) => [declineReasonValues[reason], reason]),
);

/** `decline_reason` to its key; null when unset or unknown. */
export function toDeclineReason(value: string | null): DeclineReason | null {
  return value ? (declineReasonByValue.get(value) ?? null) : null;
}

/** A key to its `decline_reason` enum value. */
export function toDeclineReasonValue(reason: DeclineReason): string {
  return declineReasonValues[reason];
}

/** The decision an action records. */
export function getActionDecision(action: ModerationAction): ReviewDecision {
  return action === "approve" ? "approved" : "declined";
}

/** Whether an action needs a decline reason. */
export function needsDeclineReason(action: ModerationAction): boolean {
  return action !== "approve";
}

/** Only pending posts can be approved, declined, or selected for either. */
export function isDecidable(status: PostStatus): boolean {
  return status === "pending";
}

/** Only approved posts can be taken down. */
export function canTakeDown(status: PostStatus): boolean {
  return status === "approved";
}

/**
 * Why a decision failed:
 * - `alreadyDecided`: another admin (or another tab) decided one of the posts first.
 * - `notFound`: one of the posts no longer exists.
 * - `forbidden`: the account isn't an admin any more.
 * - `failed`: anything else, e.g. the network.
 */
export type ModerationErrorKind =
  "alreadyDecided" | "notFound" | "forbidden" | "failed";

const errorKindByCode: Partial<Record<string, ModerationErrorKind>> = {
  FW409: "alreadyDecided",
  FW404: "notFound",
  "42501": "forbidden",
};

/** A Postgres/PostgREST error code to its kind. */
export function toModerationErrorKind(
  code: string | undefined,
): ModerationErrorKind {
  return (code ? errorKindByCode[code] : undefined) ?? "failed";
}

/** A decision the server rejected, or that never reached it. */
export class ModerationError extends Error {
  readonly kind: ModerationErrorKind;

  constructor(kind: ModerationErrorKind, options?: ErrorOptions) {
    super(`Couldn't save the decision (${kind}).`, options);
    this.name = "ModerationError";
    this.kind = kind;
  }
}

/** The kind of any error thrown while deciding. */
export function getModerationErrorKind(error: unknown): ModerationErrorKind {
  return error instanceof ModerationError ? error.kind : "failed";
}
