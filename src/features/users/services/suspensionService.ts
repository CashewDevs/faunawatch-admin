import { supabase } from "../../../core/services/supabaseClient";
import {
  SuspensionError,
  suspensionReasonMaxLength,
  toSuspensionErrorKind,
} from "../models/suspension";

/**
 * Suspension Service: suspends and reactivates users through
 * `admin_suspend_user` and `admin_reactivate_user`, the only way to write
 * `user_sanctions`. Each throws a SuspensionError whose `kind` says why
 * nothing was changed.
 */

/**
 * Suspends a user for `days` days, or until reactivated when `days` is
 * null. A suspended user can sign in but can't post reports, comments or
 * community responses.
 */
export async function suspendUser(
  userId: string,
  reason: string,
  days: number | null,
): Promise<void> {
  const text = reason.trim();
  if (!text || text.length > suspensionReasonMaxLength) {
    throw new Error("A reason of at most 500 characters is required.");
  }

  const { error } = await supabase.rpc("admin_suspend_user", {
    p_user_id: userId,
    p_reason: text,
    p_days: days,
  });
  if (error) {
    throw new SuspensionError(toSuspensionErrorKind(error.code, "suspend"), {
      cause: error,
    });
  }
}

/** Lifts a user's active suspension. */
export async function reactivateUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_reactivate_user", {
    p_user_id: userId,
  });
  if (error) {
    throw new SuspensionError(toSuspensionErrorKind(error.code, "reactivate"), {
      cause: error,
    });
  }
}
