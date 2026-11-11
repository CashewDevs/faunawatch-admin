import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppStrings } from "../../../core/constants/appStrings";
import {
  useNotice,
  type NoticeController,
} from "../../../core/hooks/useNotice";
import { formatNumber } from "../../../core/utils/formatters";
import {
  declineReasons,
  getModerationErrorKind,
  needsDeclineReason,
  type DeclineReason,
  type ModerationAction,
} from "../models/moderation";
import type { PostSummary } from "../models/post";
import { decidePosts } from "../services/moderationService";
import { allPostsQuery } from "./postQueries";

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
  /** A message area shared with the screen's other actions. */
  notice?: NoticeController;
}) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const [reason, setReason] = useState<DeclineReason | null>(null);
  const ownNotice = useNotice();
  const notice = options?.notice ?? ownNotice;

  const mutation = useMutation({
    mutationFn: ({ postIds, action, reason }: Decision) =>
      decidePosts(postIds, action, reason),
  });

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
    notice.dismiss();
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
          notice.show(
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
          if (kind === "alreadyDecided") {
            // The server says "already decided" both for a post another
            // admin decided and for one sent back for changes. Say the
            // generic thing now; once the reloaded list shows which, swap in
            // the exact message, unless a newer message has replaced this one.
            const noticeId = notice.show(
              "error",
              isMany
                ? strings.errors.alreadyDecidedMany
                : strings.errors.alreadyDecided,
            );
            void refresh().then(() => {
              const loaded = queryClient.getQueryData<PostSummary[]>(
                allPostsQuery.queryKey,
              );
              const sentBack = postIds.filter(
                (id) =>
                  loaded?.find((post) => post.id === id)?.status ===
                  "changes_requested",
              ).length;
              if (sentBack === 0) return;
              notice.update(
                noticeId,
                sentBack < postIds.length
                  ? strings.errors.decidedOrAwaitingChangesMany
                  : isMany
                    ? strings.errors.awaitingChangesMany
                    : strings.errors.awaitingChanges,
              );
            });
            return;
          }
          notice.show(
            "error",
            kind === "forbidden"
              ? strings.errors.forbidden
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
    notice: notice.notice,
    dismissNotice: notice.dismiss,
  };
}

export type ModerationFlow = ReturnType<typeof useModerationFlow>;
