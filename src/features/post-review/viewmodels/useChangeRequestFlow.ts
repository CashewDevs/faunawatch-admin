import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppStrings } from "../../../core/constants/appStrings";
import type { NoticeController } from "../../../core/hooks/useNotice";
import { formatNumber } from "../../../core/utils/formatters";
import {
  changeFields,
  changeRequestMessageMaxLength,
  getChangeRequestErrorKind,
  isChangeRequestMessageValid,
  type ChangeField,
  type ChangeRequestAction,
} from "../models/changeRequest";
import {
  requestChanges,
  withdrawChangeRequest,
} from "../services/changeRequestService";

interface Change {
  action: ChangeRequestAction;
  message: string;
  fields: readonly ChangeField[];
}

const strings = AppStrings.posts.changeRequest;

/** The message's length shows once it reaches this share of the limit. */
const counterThreshold = 0.9;

/**
 * The confirm dialogs behind the post page's Request changes and Withdraw
 * request buttons: the message and ticked fields, saving, refreshing what
 * changed, and the result message.
 */
export function useChangeRequestFlow({
  postId,
  notice,
  onChanged,
  dialogHint,
}: {
  postId: string;
  /** Shared with the page's other actions. */
  notice: NoticeController;
  /** Called after a change is saved, e.g. to save the admin's note too. */
  onChanged?: () => void;
  /** An extra line in the dialog, e.g. that a note is saved too. */
  dialogHint?: string | null;
}) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<ChangeRequestAction | null>(null);
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState<readonly ChangeField[]>([]);

  const mutation = useMutation({
    mutationFn: ({ action, message, fields }: Change) =>
      action === "request"
        ? requestChanges(postId, message, fields)
        : withdrawChangeRequest(postId),
  });

  /** The post, the lists and counts built from it, and the analytics change. */
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["posts"] }),
      queryClient.invalidateQueries({ queryKey: ["analytics"] }),
    ]);

  const open = (next: ChangeRequestAction) => {
    if (mutation.isPending) return;
    mutation.reset();
    setMessage("");
    setFields([]);
    notice.dismiss();
    setAction(next);
  };

  const cancel = () => {
    if (mutation.isPending) return;
    mutation.reset();
    setAction(null);
  };

  const toggleField = (field: ChangeField) => {
    setFields((current) =>
      current.includes(field)
        ? current.filter((candidate) => candidate !== field)
        : [...current, field],
    );
  };

  const canConfirm =
    action !== null &&
    !mutation.isPending &&
    (action === "withdraw" || isChangeRequestMessageValid(message));

  const confirm = () => {
    if (action === null || !canConfirm) return;
    mutation.mutate(
      { action, message, fields },
      {
        onSuccess: () => {
          setAction(null);
          notice.show("success", strings.success[action]);
          onChanged?.();
          void refresh();
        },
        onError: (error) => {
          const kind = getChangeRequestErrorKind(error);
          // A network or unknown failure, or a message the server refused,
          // stays in the dialog to retry or fix.
          if (kind === "failed" || kind === "invalidInput") return;
          setAction(null);
          notice.show("error", strings.errors[kind]);
          void refresh();
        },
      },
    );
  };

  const dialogView = action && {
    action,
    title: strings.title[action],
    body: strings.body[action],
    hint: dialogHint ?? null,
    needsMessage: action === "request",
    confirmLabel: mutation.isPending ? strings.saving : strings.confirm[action],
    isSaving: mutation.isPending,
    canConfirm,
    error: mutation.isError
      ? getChangeRequestErrorKind(mutation.error) === "invalidInput"
        ? strings.invalidMessage
        : getChangeRequestErrorKind(mutation.error) === "failed"
          ? strings.failed
          : null
      : null,
  };

  return {
    dialog: dialogView,
    message,
    changeMessage: setMessage,
    messageMaxLength: changeRequestMessageMaxLength,
    /** "480 / 500", shown only near the limit. */
    messageLengthLabel:
      message.length >= changeRequestMessageMaxLength * counterThreshold
        ? `${formatNumber(message.length)} ${AppStrings.posts.detail.notes.lengthSeparator} ${formatNumber(changeRequestMessageMaxLength)}`
        : null,
    fields: changeFields.map((key) => ({
      key,
      label: strings.fields[key],
      isChecked: fields.includes(key),
    })),
    toggleField,
    open,
    cancel,
    confirm,
  };
}

export type ChangeRequestFlow = ReturnType<typeof useChangeRequestFlow>;
