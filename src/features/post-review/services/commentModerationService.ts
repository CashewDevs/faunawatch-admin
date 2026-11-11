import { supabase } from "../../../core/services/supabaseClient";
import {
  CommentModerationError,
  isRemovalReasonValid,
  toCommentModerationErrorKind,
  type CommentAction,
} from "../models/commentModeration";

/**
 * Comment Moderation Service: removes, restores and clears flags on
 * comments through admin RPCs, the only way to write `comment_moderation`.
 * Throws a CommentModerationError whose `kind` says why nothing changed.
 */
export async function moderateComment(
  commentId: string,
  action: CommentAction,
  reason: string | null,
): Promise<void> {
  if (action === "remove" && !isRemovalReasonValid(reason ?? "")) {
    throw new Error("A reason of at most 500 characters is required.");
  }

  const { error } =
    action === "remove"
      ? await supabase.rpc("admin_remove_comment", {
          p_comment_id: commentId,
          p_reason: (reason ?? "").trim(),
        })
      : await supabase.rpc(
          action === "restore"
            ? "admin_restore_comment"
            : "admin_clear_comment_flag",
          { p_comment_id: commentId },
        );
  if (error) {
    throw new CommentModerationError(toCommentModerationErrorKind(error.code), {
      cause: error,
    });
  }
}
