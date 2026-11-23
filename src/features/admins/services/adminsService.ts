import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { AppRoutes } from "../../../core/constants/appRoutes";
import { supabase } from "../../../core/services/supabaseClient";
import {
  AdminActionError,
  toAdminMember,
  toFunctionErrorKind,
  toRemoveErrorKind,
  type AdminMember,
  type AdminMemberRow,
} from "../models/adminMember";

/**
 * Supabase access for the Admins page. Listing and removing are database
 * functions; inviting, resending and cancelling go through the Edge Function
 * manage-admins (it needs Supabase Auth's admin API). Raw Supabase errors are
 * translated to AdminActionError and never shown.
 */

export async function listAdmins(): Promise<AdminMember[]> {
  const { data, error } = await supabase.rpc("admin_list_admins");
  if (error) {
    throw new AdminActionError(error.code === "42501" ? "notAllowed" : "unknown", {
      cause: error,
    });
  }
  return ((data ?? []) as AdminMemberRow[]).map(toAdminMember);
}

/** Takes away an active admin's access; their account stays. */
export async function removeAdmin(userId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_remove_admin", {
    p_user_id: userId,
  });
  if (error) {
    throw new AdminActionError(toRemoveErrorKind(error), { cause: error });
  }
}

type ManageResult = "invited" | "restored" | "resent" | "cancelled";

async function manageAdmins(body: Record<string, string>): Promise<ManageResult> {
  const { data, error } = await supabase.functions.invoke<{ result: ManageResult }>(
    "manage-admins",
    { body },
  );
  if (error) {
    if (error instanceof FunctionsFetchError) {
      throw new AdminActionError("network", { cause: error });
    }
    let code: unknown;
    if (error instanceof FunctionsHttpError) {
      try {
        const answer = (await (error.context as Response).json()) as {
          error?: unknown;
        };
        code = answer.error;
      } catch {
        code = undefined;
      }
    }
    throw new AdminActionError(toFunctionErrorKind(code), { cause: error });
  }
  if (!data?.result) throw new AdminActionError("unknown");
  return data.result;
}

/** Where invitation links lead: this site's accept-invite page. */
function acceptInviteUrl(): string {
  return `${window.location.origin}${AppRoutes.acceptInvite}`;
}

/**
 * Invites [email] to be an admin. "restored" when it belonged to a removed
 * admin, who gets access back with their old password (no email).
 */
export function inviteAdmin(email: string): Promise<"invited" | "restored"> {
  return manageAdmins({
    action: "invite",
    email: email.trim(),
    redirectTo: acceptInviteUrl(),
  }) as Promise<"invited" | "restored">;
}

/** Sends a new invitation link; the old one stops working. */
export async function resendInvite(userId: string): Promise<void> {
  await manageAdmins({ action: "resend", userId, redirectTo: acceptInviteUrl() });
}

/** Cancels an invitation; the unused account is deleted. */
export async function cancelInvite(userId: string): Promise<void> {
  await manageAdmins({ action: "cancel", userId });
}
