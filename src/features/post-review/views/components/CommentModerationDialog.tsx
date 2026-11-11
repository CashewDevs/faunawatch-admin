import { useId } from "react";
import { Modal } from "../../../../core/components/Modal";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { CommentModerationFlow } from "../../viewmodels/useCommentModerationFlow";

interface CommentModerationDialogProps {
  commentModeration: CommentModerationFlow;
}

const buttonClass =
  "rounded-lg px-4 py-2 text-sm leading-5 font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Confirms removing a comment (with a reason only admins see), restoring
 * it, or clearing its flag. Quotes the comment so the admin can check it's
 * the right one.
 */
export function CommentModerationDialog({
  commentModeration,
}: CommentModerationDialogProps) {
  const strings = AppStrings.posts.detail.comments.moderation;
  const titleId = useId();
  const bodyId = useId();
  const reasonId = useId();
  const reasonHintId = useId();
  const { dialog } = commentModeration;

  return (
    <Modal
      isOpen={dialog !== null}
      onClose={commentModeration.cancel}
      titleId={titleId}
      descriptionId={bodyId}
    >
      {dialog && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            commentModeration.confirm();
          }}
          className="flex flex-col gap-5 p-6"
        >
          <div className="flex flex-col gap-2">
            <h2
              id={titleId}
              className="text-lg leading-7 font-bold text-deep-blue"
            >
              {dialog.title}
            </h2>
            <p id={bodyId} className="text-sm leading-5 text-slate">
              {dialog.body}
            </p>
          </div>

          <figure className="flex flex-col gap-1 rounded-lg bg-surface-tint px-3 py-2">
            <figcaption className="text-xs leading-4 font-bold text-deep-blue">
              {strings.commentBy} {dialog.authorName}
            </figcaption>
            <blockquote className="line-clamp-4 text-sm leading-5 break-words text-ink">
              {dialog.commentBody}
            </blockquote>
          </figure>

          {dialog.needsReason && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor={reasonId}
                className="text-sm leading-5 font-bold text-deep-blue"
              >
                {strings.reasonLabel}
              </label>
              <p id={reasonHintId} className="text-xs leading-4 text-muted">
                {strings.reasonHint}
              </p>
              <textarea
                id={reasonId}
                rows={2}
                value={commentModeration.reason}
                maxLength={commentModeration.reasonMaxLength}
                required
                disabled={dialog.isSaving}
                aria-describedby={reasonHintId}
                onChange={(event) => {
                  commentModeration.changeReason(event.target.value);
                }}
                className="mt-1 resize-y rounded-lg bg-surface-tint px-3 py-2 text-sm leading-5 text-ink placeholder:text-muted focus:outline-2 focus:outline-primary disabled:opacity-50"
              />
            </div>
          )}

          {dialog.error && (
            <p
              role="alert"
              className="rounded-lg bg-danger-tint px-3 py-2 text-sm leading-5 text-danger"
            >
              {dialog.error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={commentModeration.cancel}
              disabled={dialog.isSaving}
              className={`${buttonClass} bg-surface-tint text-deep-blue hover:bg-chip`}
            >
              {strings.cancel}
            </button>
            <button
              type="submit"
              disabled={!dialog.canConfirm}
              aria-busy={dialog.isSaving}
              className={`${buttonClass} text-white ${
                dialog.action === "remove"
                  ? "bg-danger hover:bg-danger/90"
                  : "bg-teal hover:bg-teal/90"
              }`}
            >
              {dialog.confirmLabel}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
