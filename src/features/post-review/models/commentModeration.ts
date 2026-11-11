/**
 * Comment moderation: removing a comment (hidden from the community, with
 * a reason), restoring it, and clearing a flag ("Review Flag").
 *
 * The database (`admin_remove_comment`, `admin_restore_comment`,
 * `admin_clear_comment_flag` in the faunawatch repo) checks each comment's
 * current state, so a stale page can't undo another admin's change.
 */

import type { PostComment } from "./post";

export type CommentAction = "remove" | "restore" | "clearFlag";

/** The database's limit on the removal reason. */
export const commentRemovalReasonMaxLength = 500;

/** What an admin can do to a comment as it is now. */
export function getCommentActions(
  comment: PostComment,
): readonly CommentAction[] {
  if (comment.removal) return ["restore"];
  return comment.isFlagged ? ["remove", "clearFlag"] : ["remove"];
}

export function needsRemovalReason(action: CommentAction): boolean {
  return action === "remove";
}

/** Whether the removal reason can be saved. */
export function isRemovalReasonValid(reason: string): boolean {
  const text = reason.trim();
  return text !== "" && text.length <= commentRemovalReasonMaxLength;
}

export type CommentModerationErrorKind =
  "alreadyChanged" | "notFound" | "forbidden" | "failed";

const errorKindByCode: Partial<Record<string, CommentModerationErrorKind>> = {
  FW409: "alreadyChanged",
  FW404: "notFound",
  "42501": "forbidden",
};

/** A Postgres/PostgREST error code to its kind. */
export function toCommentModerationErrorKind(
  code: string | undefined,
): CommentModerationErrorKind {
  return (code ? errorKindByCode[code] : undefined) ?? "failed";
}

/** A comment change the server rejected, or that never reached it. */
export class CommentModerationError extends Error {
  readonly kind: CommentModerationErrorKind;

  constructor(kind: CommentModerationErrorKind, options?: ErrorOptions) {
    super(`Couldn't change the comment (${kind}).`, options);
    this.name = "CommentModerationError";
    this.kind = kind;
  }
}

/** The kind of any error thrown while moderating a comment. */
export function getCommentModerationErrorKind(
  error: unknown,
): CommentModerationErrorKind {
  return error instanceof CommentModerationError ? error.kind : "failed";
}
