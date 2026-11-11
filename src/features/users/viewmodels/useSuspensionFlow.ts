import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppStrings } from "../../../core/constants/appStrings";
import { useNotice } from "../../../core/hooks/useNotice";
import { formatDateTime } from "../../../core/utils/formatters";
import type { AdminUser } from "../models/adminUser";
import {
  canChangeSuspension,
  composeSuspensionReason,
  getSuspensionAction,
  getSuspensionDays,
  getSuspensionErrorKind,
  isSuspensionReasonComplete,
  needsSuspensionDetails,
  suspensionDetailsMaxLength,
  suspensionDurations,
  suspensionReasons,
  type SuspensionAction,
  type SuspensionDuration,
  type SuspensionReason,
} from "../models/suspension";
import { reactivateUser, suspendUser } from "../services/suspensionService";

interface OpenDialog {
  action: SuspensionAction;
  user: AdminUser;
}

type Change =
  | { action: "suspend"; userId: string; reason: string; days: number | null }
  | { action: "reactivate"; userId: string };

const strings = AppStrings.users.suspension;

/** The name in titles and messages. */
function getUserName(user: AdminUser): string {
  return user.fullName || AppStrings.users.table.unnamed;
}

/**
 * The confirm dialog behind each user's account switch: suspend (length,
 * reason, optional details) or reactivate, saving, refreshing the users
 * and their stats, and the result message.
 */
export function useSuspensionFlow() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const [duration, setDuration] = useState<SuspensionDuration | null>(null);
  const [reason, setReason] = useState<SuspensionReason | null>(null);
  const [details, setDetails] = useState("");
  const notice = useNotice();

  const mutation = useMutation({
    mutationFn: (change: Change) =>
      change.action === "suspend"
        ? suspendUser(change.userId, change.reason, change.days)
        : reactivateUser(change.userId),
  });

  /** The table, the stat cards and the Analytics user figures. */
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const open = (user: AdminUser) => {
    if (!canChangeSuspension(user) || mutation.isPending) return;
    mutation.reset();
    setDuration(null);
    setReason(null);
    setDetails("");
    notice.dismiss();
    setDialog({ action: getSuspensionAction(user), user });
  };

  const cancel = () => {
    if (mutation.isPending) return;
    mutation.reset();
    setDialog(null);
  };

  const canConfirm =
    dialog !== null &&
    !mutation.isPending &&
    (dialog.action === "reactivate" ||
      (duration !== null && isSuspensionReasonComplete(reason, details)));

  const confirm = () => {
    if (!dialog || !canConfirm) return;
    const { action, user } = dialog;
    let change: Change;
    if (action === "suspend") {
      if (!duration || !reason) return;
      change = {
        action,
        userId: user.id,
        reason: composeSuspensionReason(
          reason,
          strings.reasons[reason],
          details,
        ),
        days: getSuspensionDays(duration),
      };
    } else {
      change = { action, userId: user.id };
    }
    const name = getUserName(user);
    mutation.mutate(change, {
      onSuccess: () => {
        setDialog(null);
        notice.show(
          "success",
          `${name} ${
            action === "suspend" && duration
              ? strings.success[duration]
              : strings.success.reactivate
          }`,
        );
        void refresh();
      },
      onError: (error) => {
        const kind = getSuspensionErrorKind(error);
        // A network or unknown failure stays in the dialog to retry.
        if (kind === "failed") return;
        setDialog(null);
        notice.show("error", strings.errors[kind]);
        void refresh();
      },
    });
  };

  const needsDetails = reason !== null && needsSuspensionDetails(reason);

  const dialogView = dialog && {
    action: dialog.action,
    title: `${strings.titlePrefix[dialog.action]} ${getUserName(dialog.user)}${strings.titleSuffix}`,
    body: strings.body[dialog.action],
    /** What is being lifted, shown before reactivating. */
    current:
      dialog.action === "reactivate"
        ? {
            reason: dialog.user.suspensionReason ?? strings.noReason,
            ends: dialog.user.suspendedUntil
              ? formatDateTime(dialog.user.suspendedUntil)
              : strings.untilReactivated,
          }
        : null,
    detailsLabel: needsDetails
      ? strings.detailsRequiredLabel
      : strings.detailsLabel,
    needsDetails,
    confirmLabel: mutation.isPending
      ? strings.saving
      : strings.confirm[dialog.action],
    isSaving: mutation.isPending,
    canConfirm,
    error:
      mutation.isError && getSuspensionErrorKind(mutation.error) === "failed"
        ? strings.failed
        : null,
  };

  return {
    dialog: dialogView,
    durations: suspensionDurations.map((key) => ({
      key,
      label: strings.durations[key],
    })),
    duration,
    chooseDuration: setDuration,
    reasons: suspensionReasons.map((key) => ({
      key,
      label: strings.reasons[key],
    })),
    reason,
    chooseReason: setReason,
    details,
    changeDetails: setDetails,
    detailsMaxLength: suspensionDetailsMaxLength,
    open,
    cancel,
    confirm,
    notice: notice.notice,
    dismissNotice: notice.dismiss,
  };
}

export type SuspensionFlow = ReturnType<typeof useSuspensionFlow>;
