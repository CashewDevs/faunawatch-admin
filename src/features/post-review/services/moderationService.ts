import { supabase } from "../../../core/services/supabaseClient";
import {
  getActionDecision,
  ModerationError,
  needsDeclineReason,
  toDeclineReasonValue,
  toModerationErrorKind,
  type DeclineReason,
  type ModerationAction,
} from "../models/moderation";

/**
 * Moderation Service: records approve / decline / take-down decisions.
 * Approve and decline go through `admin_decide_report` (pending posts
 * only); take down goes through `admin_take_down_report` (approved posts
 * only), so a stale Decline can never take a post down. Both write the
 * review row and the new status together.
 */

/**
 * Decides every post in `postIds` the same way, all or nothing. A take
 * down is one post at a time. Throws a ModerationError whose `kind` says
 * why when nothing was changed.
 */
export async function decidePosts(
  postIds: readonly string[],
  action: ModerationAction,
  reason: DeclineReason | null,
): Promise<void> {
  const declineReason = needsDeclineReason(action) ? reason : null;
  if (needsDeclineReason(action) && !declineReason) {
    throw new Error("A decline reason is required.");
  }

  const [firstId] = postIds;
  if (action === "takeDown" && (postIds.length !== 1 || !firstId)) {
    throw new Error("Take down one post at a time.");
  }

  const { error } =
    action === "takeDown"
      ? await supabase.rpc("admin_take_down_report", {
          p_report_id: firstId,
          p_decline_reason: declineReason
            ? toDeclineReasonValue(declineReason)
            : null,
        })
      : await supabase.rpc("admin_decide_report", {
          p_report_ids: [...postIds],
          p_decision: getActionDecision(action),
          p_decline_reason: declineReason
            ? toDeclineReasonValue(declineReason)
            : null,
        });
  if (error) {
    throw new ModerationError(toModerationErrorKind(error.code), {
      cause: error,
    });
  }
}
