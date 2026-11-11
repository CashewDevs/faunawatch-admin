import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppStrings } from "../../../core/constants/appStrings";
import type { NoticeController } from "../../../core/hooks/useNotice";
import {
  commentRemovalReasonMaxLength,
  getCommentActions,
  getCommentModerationErrorKind,
  isRemovalReasonValid,
  needsRemovalReason,
  type CommentAction,
} from "../models/commentModeration";
import type { PostComment } from "../models/post";
import { moderateComment } from "../services/commentModerationService";

interface OpenDialog {
  action: CommentAction;
  comment: PostComment;
}

interface Change {
  commentId: string;
  action: CommentAction;
  reason: string | null;
}

const strings = AppStrings.posts.detail.comments.moderation;

/**
 * The confirm dialog behind each comment's Remove, Review Flag and Restore
 * buttons on the post review page: the removal reason, saving, reloading
 * the post, and the result message.
 */
export function useCommentModerationFlow({
  postId,
  notice,
}: {
  postId: string;
  /** Shared with the post's decision buttons. */
  notice: NoticeController;
}) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: ({ commentId, action, reason }: Change) =>
      moderateComment(commentId, action, reason),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["posts", "detail", postId] });

  const open = (action: CommentAction, comment: PostComment) => {
    if (!getCommentActions(comment).includes(action) || mutation.isPending) {
      return;
    }
    mutation.reset();
    setReason("");
    notice.dismiss();
    setDialog({ action, comment });
  };

  const cancel = () => {
    if (mutation.isPending) return;
    mutation.reset();
    setDialog(null);
  };

  const canConfirm =
    dialog !== null &&
    !mutation.isPending &&
    (!needsRemovalReason(dialog.action) || isRemovalReasonValid(reason));

  const confirm = () => {
    if (!dialog || !canConfirm) return;
    const { action, comment } = dialog;
    mutation.mutate(
      {
        commentId: comment.id,
        action,
        reason: needsRemovalReason(action) ? reason : null,
      },
      {
        onSuccess: () => {
          setDialog(null);
          notice.show("success", strings.success[action]);
          void refresh();
        },
        onError: (error) => {
          const kind = getCommentModerationErrorKind(error);
          // A network or unknown failure stays in the dialog to retry.
          if (kind === "failed") return;
          setDialog(null);
          notice.show("error", strings.errors[kind]);
          void refresh();
        },
      },
    );
  };

  const dialogView = dialog && {
    action: dialog.action,
    title: strings.title[dialog.action],
    body: strings.body[dialog.action],
    authorName: dialog.comment.authorName,
    commentBody: dialog.comment.body,
    needsReason: needsRemovalReason(dialog.action),
    confirmLabel: mutation.isPending
      ? strings.saving
      : strings.confirm[dialog.action],
    isSaving: mutation.isPending,
    canConfirm,
    error:
      mutation.isError &&
      getCommentModerationErrorKind(mutation.error) === "failed"
        ? strings.failed
        : null,
  };

  return {
    dialog: dialogView,
    reason,
    changeReason: setReason,
    reasonMaxLength: commentRemovalReasonMaxLength,
    open,
    cancel,
    confirm,
  };
}

export type CommentModerationFlow = ReturnType<typeof useCommentModerationFlow>;
