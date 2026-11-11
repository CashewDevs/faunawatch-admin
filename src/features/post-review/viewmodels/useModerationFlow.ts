import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppStrings } from "../../../core/constants/appStrings";
import { formatNumber } from "../../../core/utils/formatters";
import {
  declineReasons,
  getModerationErrorKind,
  needsDeclineReason,
  type DeclineReason,
  type ModerationAction,
} from "../models/moderation";
import { decidePosts } from "../services/moderationService";

/** How long a success message stays up. Errors stay until dismissed. */
export const successNoticeMs = 5000;

export interface ModerationNotice {
  /** Changes on every message, so a repeated message restarts its timer. */
  id: number;
  tone: "success" | "error";
  message: string;
}

interface OpenDialog {
  action: ModerationAction;
  postIds: readonly string[];
}

interface Decision {
  postIds: readonly string[];
  action: ModerationAction;
  reason: DeclineReason | null;
}

const strings = AppStrings.posts.moderation;

/**
 * The confirm dialog behind every approve / decline / take-down button,
 * shared by Post Approvals and the post detail page: which posts, the
 * decline reason, saving, refreshing what changed, and the result message.
 */
export function useModerationFlow(options?: {
  /** Called after a decision is saved, e.g. to clear a selection. */
  onDecided?: () => void;
  /** An extra line in the dialog, e.g. that a note is saved too. */
  dialogHint?: string | null;
}) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const [reason, setReason] = useState<DeclineReason | null>(null);
  const [notice, setNotice] = useState<ModerationNotice | null>(null);

  const mutation = useMutation({
    mutationFn: ({ postIds, action, reason }: Decision) =>
      decidePosts(postIds, action, reason),
  });

  useEffect(() => {
    if (notice?.tone !== "success") return;
    const timer = setTimeout(() => {
      setNotice(null);
    }, successNoticeMs);
    return () => {
      clearTimeout(timer);
    };
  }, [notice]);

  const showNotice = (tone: ModerationNotice["tone"], message: string) => {
    setNotice({ id: Date.now(), tone, message });
  };

  /** Posts, their counts, and the analytics built from them all change. */
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["posts"] }),
      queryClient.invalidateQueries({ queryKey: ["analytics"] }),
    ]);

  const open = (action: ModerationAction, postIds: readonly string[]) => {
    const unique = [...new Set(postIds)];
    if (unique.length === 0 || mutation.isPending) return;
    mutation.reset();
    setReason(null);
    setNotice(null);
    setDialog({ action, postIds: unique });
  };

  const cancel = () => {
    if (mutation.isPending) return;
    mutation.reset();
    setDialog(null);
  };

  const canConfirm =
    dialog !== null &&
    !mutation.isPending &&
    (!needsDeclineReason(dialog.action) || reason !== null);

  const confirm = () => {
    if (!dialog || !canConfirm) return;
    const { action, postIds } = dialog;
    const isMany = postIds.length > 1;
    mutation.mutate(
      { postIds, action, reason },
      {
        onSuccess: () => {
          setDialog(null);
          showNotice(
            "success",
            isMany
              ? `${formatNumber(postIds.length)} ${strings.successMany[action]}`
              : strings.success[action],
          );
          options?.onDecided?.();
          void refresh();
        },
        onError: (error) => {
          const kind = getModerationErrorKind(error);
          // A network or unknown failure stays in the dialog to retry.
          if (kind === "failed") return;
          setDialog(null);
          showNotice(
            "error",
            kind === "forbidden"
              ? strings.errors.forbidden
              : kind === "alreadyDecided"
                ? isMany
                  ? strings.errors.alreadyDecidedMany
                  : strings.errors.alreadyDecided
                : isMany
                  ? strings.errors.notFoundMany
                  : strings.errors.notFound,
          );
          void refresh();
        },
      },
    );
  };

  const dialogView = dialog && {
    action: dialog.action,
    count: dialog.postIds.length,
    title:
      dialog.postIds.length > 1
        ? `${strings.titleManyPrefix[dialog.action]} ${formatNumber(dialog.postIds.length)} ${strings.titleManySuffix}`
        : strings.title[dialog.action],
    body:
      dialog.postIds.length > 1
        ? strings.bodyMany[dialog.action]
        : strings.body[dialog.action],
    hint: options?.dialogHint ?? null,
    needsReason: needsDeclineReason(dialog.action),
    reasonHint: dialog.postIds.length > 1 ? strings.reasonManyHint : null,
    confirmLabel: mutation.isPending
      ? strings.saving
      : strings.confirm[dialog.action],
    isSaving: mutation.isPending,
    canConfirm,
    error:
      mutation.isError && getModerationErrorKind(mutation.error) === "failed"
        ? strings.failed
        : null,
  };

  return {
    dialog: dialogView,
    reasons: declineReasons.map((key) => ({
      key,
      label: strings.reasons[key],
    })),
    reason,
    chooseReason: setReason,
    open,
    cancel,
    confirm,
    notice,
    dismissNotice: () => {
      setNotice(null);
    },
  };
}

export type ModerationFlow = ReturnType<typeof useModerationFlow>;
