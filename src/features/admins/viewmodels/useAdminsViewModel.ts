import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { AppStrings } from "../../../core/constants/appStrings";
import { useNotice } from "../../../core/hooks/useNotice";
import {
  getAdminActionErrorKind,
  type AdminActionErrorKind,
  type AdminMember,
} from "../models/adminMember";
import {
  cancelInvite,
  inviteAdmin,
  listAdmins,
  removeAdmin,
  resendInvite,
} from "../services/adminsService";

const strings = AppStrings.admins;

export const adminsQuery = queryOptions({
  queryKey: ["admins", "list"],
  queryFn: listAdmins,
});

/** Refusals that mean the list on screen is out of date. */
const staleListKinds: readonly AdminActionErrorKind[] = [
  "notInvited",
  "notAdmin",
  "alreadyAdmin",
  "alreadyInvited",
  "invitePending",
];

function withEmail(template: string, email: string): string {
  return template.replace("{email}", email);
}

/** A remove or cancel waiting for the admin to confirm. */
export interface PendingConfirmation {
  kind: "remove" | "cancel";
  member: AdminMember;
}

/**
 * Presentation state and actions for the Admins page: the list, the invite
 * dialog, confirmations for remove and cancel, and one message area.
 */
export function useAdminsViewModel(now: () => Date = () => new Date()) {
  const queryClient = useQueryClient();
  const list = useQuery(adminsQuery);
  const notice = useNotice();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(
    null,
  );

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: adminsQuery.queryKey });

  const errorMessage = (error: unknown) => {
    const kind = getAdminActionErrorKind(error);
    if (staleListKinds.includes(kind)) void refresh();
    return strings.errors[kind];
  };

  const invite = useMutation({
    mutationFn: (email: string) => inviteAdmin(email),
    onSuccess: (result, email) => {
      setIsInviteOpen(false);
      setInviteEmail("");
      notice.show(
        "success",
        withEmail(strings.success[result], email.trim().toLowerCase()),
      );
      void refresh();
    },
    // Shown in the dialog, which stays open to fix the email.
    onError: (error) => {
      setInviteError(errorMessage(error));
    },
  });

  const resend = useMutation({
    mutationFn: (member: AdminMember) => resendInvite(member.userId),
    onSuccess: (_, member) => {
      notice.show("success", withEmail(strings.success.resent, member.email));
      void refresh();
    },
    onError: (error) => notice.show("error", errorMessage(error)),
  });

  const confirm = useMutation({
    mutationFn: ({ kind, member }: PendingConfirmation) =>
      kind === "remove"
        ? removeAdmin(member.userId)
        : cancelInvite(member.userId),
    onSuccess: (_, { kind, member }) => {
      setConfirmation(null);
      notice.show(
        "success",
        withEmail(
          kind === "remove"
            ? strings.success.removed
            : strings.success.cancelled,
          member.email,
        ),
      );
      void refresh();
    },
    onError: (error) => {
      setConfirmation(null);
      notice.show("error", errorMessage(error));
    },
  });

  return {
    admins: list.data ?? [],
    isLoading: list.isPending,
    loadFailed: list.isError,
    now: now(),
    notice,

    isInviteOpen,
    inviteEmail,
    inviteError,
    isInviting: invite.isPending,
    openInvite: () => {
      setInviteEmail("");
      setInviteError(null);
      setIsInviteOpen(true);
    },
    closeInvite: () => {
      if (!invite.isPending) setIsInviteOpen(false);
    },
    changeInviteEmail: (value: string) => {
      setInviteEmail(value);
      setInviteError(null);
    },
    submitInvite: () => {
      if (invite.isPending) return;
      if (!inviteEmail.trim()) {
        setInviteError(strings.errors.invalidEmail);
        return;
      }
      invite.mutate(inviteEmail);
    },

    /** The account whose invitation is being resent, if any. */
    resendingId: resend.isPending ? resend.variables.userId : null,
    resendInvite: (member: AdminMember) => {
      if (!resend.isPending) resend.mutate(member);
    },

    confirmation,
    isConfirming: confirm.isPending,
    askRemove: (member: AdminMember) => {
      setConfirmation({ kind: "remove", member });
    },
    askCancel: (member: AdminMember) => {
      setConfirmation({ kind: "cancel", member });
    },
    closeConfirmation: () => {
      if (!confirm.isPending) setConfirmation(null);
    },
    confirmAction: () => {
      if (confirmation && !confirm.isPending) confirm.mutate(confirmation);
    },
  };
}

export type AdminsViewModel = ReturnType<typeof useAdminsViewModel>;
