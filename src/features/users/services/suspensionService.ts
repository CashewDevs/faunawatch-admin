import { supabase } from "../../../core/services/supabaseClient";
import {
  SuspensionError,
  suspensionMessageMaxLength,
  toSuspensionCategory,
  toSuspensionErrorKind,
  type SuspensionLevel,
  type SuspensionReason,
} from "../models/suspension";

/**
 * Suspension Service: suspends and reactivates users through
 * `admin_suspend_user(user_id, category, level, reason, days)` and
 * `admin_reactivate_user`, the only way to write
 * `user_sanctions`. Each throws a SuspensionError whose `kind` says why
 * nothing was changed.
 */

export interface Suspension {
  reason: SuspensionReason;
  level: SuspensionLevel;
  /** The admin's message to the user (app and email). */
  message: string;
  /** Null = until an admin reactivates the user. */
  days: number | null;
}

/**
 * Suspends a user. The database then notifies and emails them, and the
 * app restricts or locks their account by the level.
 */
export async function suspendUser(
  userId: string,
  suspension: Suspension,
): Promise<void> {
  const text = suspension.message.trim();
  if (!text || text.length > suspensionMessageMaxLength) {
    throw new Error("A message of at most 500 characters is required.");
  }

  const { error } = await supabase.rpc("admin_suspend_user", {
    p_user_id: userId,
    p_category: toSuspensionCategory(suspension.reason),
    p_level: suspension.level,
    p_reason: text,
    p_days: suspension.days,
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
