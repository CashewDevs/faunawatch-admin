import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppStrings } from "../../../core/constants/appStrings";
import { useNotice } from "../../../core/hooks/useNotice";
import { formatDateTime } from "../../../core/utils/formatters";
import type { AdminUser } from "../models/adminUser";
import {
  canChangeSuspension,
  getPresetLevel,
  getSuspensionAction,
  getSuspensionDays,
  getSuspensionErrorKind,
  isSuspensionComplete,
  suspensionDurations,
  suspensionLevels,
  suspensionMessageMaxLength,
  suspensionReasons,
  type SuspensionAction,
  type SuspensionDuration,
  type SuspensionLevel,
  type SuspensionReason,
} from "../models/suspension";
import {
  reactivateUser,
  suspendUser,
  type Suspension,
} from "../services/suspensionService";

interface OpenDialog {
  action: SuspensionAction;
  user: AdminUser;
}

type Change =
  | { action: "suspend"; userId: string; suspension: Suspension }
  | { action: "reactivate"; userId: string };

const strings = AppStrings.users.suspension;

/** The name in titles and messages. */
function getUserName(user: AdminUser): string {
  return user.fullName || AppStrings.users.table.unnamed;
}

/**
 * The confirm dialog behind each user's account switch: suspend (reason,
 * level, length, message to the user) or reactivate, saving, refreshing
 * the users and their stats, and the result message.
 */
export function useSuspensionFlow() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const [reason, setReason] = useState<SuspensionReason | null>(null);
  const [level, setLevel] = useState<SuspensionLevel | null>(null);
  const [duration, setDuration] = useState<SuspensionDuration | null>(null);
  const [message, setMessage] = useState("");
  const notice = useNotice();

  const mutation = useMutation({
    mutationFn: (change: Change) =>
      change.action === "suspend"
        ? suspendUser(change.userId, change.suspension)
        : reactivateUser(change.userId),
  });

  /** The table, the stat cards and the Analytics user figures. */
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const open = (user: AdminUser) => {
    if (!canChangeSuspension(user) || mutation.isPending) return;
    mutation.reset();
    setReason(null);
    setLevel(null);
    setDuration(null);
    setMessage("");
    notice.dismiss();
    setDialog({ action: getSuspensionAction(user), user });
  };

  const cancel = () => {
    if (mutation.isPending) return;
    mutation.reset();
    setDialog(null);
  };

  /** A reason brings its suggested level (none for Other). */
  const chooseReason = (next: SuspensionReason) => {
    setReason(next);
    setLevel(getPresetLevel(next));
  };

  const canConfirm =
    dialog !== null &&
    !mutation.isPending &&
    (dialog.action === "reactivate" ||
      isSuspensionComplete({ duration, reason, level, message }));

  const confirm = () => {
    if (!dialog || !canConfirm) return;
    const { action, user } = dialog;
    let change: Change;
    if (action === "suspend") {
      if (!duration || !reason || !level) return;
      change = {
        action,
        userId: user.id,
        suspension: {
          reason,
          level,
          message,
          days: getSuspensionDays(duration),
        },
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

  const dialogView = dialog && {
    action: dialog.action,
    title: `${strings.titlePrefix[dialog.action]} ${getUserName(dialog.user)}${strings.titleSuffix}`,
    body: strings.body[dialog.action],
    /** What is being lifted, shown before reactivating. */
    current:
      dialog.action === "reactivate"
        ? {
            reason: dialog.user.suspensionCategory
              ? strings.reasons[dialog.user.suspensionCategory]
              : strings.noReason,
            level: dialog.user.suspensionLevel
              ? strings.levels[dialog.user.suspensionLevel]
              : null,
            message: dialog.user.suspensionReason,
            ends: dialog.user.suspendedUntil
              ? formatDateTime(dialog.user.suspendedUntil)
              : strings.untilReactivated,
          }
        : null,
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
    reasons: suspensionReasons.map((key) => ({
      key,
      label: strings.reasons[key],
    })),
    reason,
    chooseReason,
    levels: suspensionLevels.map((key) => ({
      key,
      label: strings.levels[key],
      description: strings.levelDescriptions[key],
    })),
    level,
    chooseLevel: setLevel,
    durations: suspensionDurations.map((key) => ({
      key,
      label: strings.durations[key],
    })),
    duration,
    chooseDuration: setDuration,
    message,
    changeMessage: setMessage,
    messageMaxLength: suspensionMessageMaxLength,
    open,
    cancel,
    confirm,
    notice: notice.notice,
    dismissNotice: notice.dismiss,
  };
}

export type SuspensionFlow = ReturnType<typeof useSuspensionFlow>;
