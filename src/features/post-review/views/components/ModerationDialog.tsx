import { useId } from "react";
import { Modal } from "../../../../core/components/Modal";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { ModerationFlow } from "../../viewmodels/useModerationFlow";

interface ModerationDialogProps {
  moderation: ModerationFlow;
}

const buttonClass =
  "rounded-lg px-4 py-2 text-sm leading-5 font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Confirms an approve, decline, or take-down. Declines and take-downs pick
 * one reason, which is recorded for every post in the decision.
 */
export function ModerationDialog({ moderation }: ModerationDialogProps) {
  const strings = AppStrings.posts.moderation;
  const titleId = useId();
  const bodyId = useId();
  const hintId = useId();
  const { dialog } = moderation;

  return (
    <Modal
      isOpen={dialog !== null}
      onClose={moderation.cancel}
      titleId={titleId}
      descriptionId={bodyId}
    >
      {dialog && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            moderation.confirm();
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

          {dialog.needsReason && (
            <fieldset
              aria-describedby={dialog.reasonHint ? hintId : undefined}
              disabled={dialog.isSaving}
              className="flex flex-col gap-2"
            >
              <legend className="mb-2 text-sm leading-5 font-bold text-deep-blue">
                {strings.reasonLabel}
              </legend>
              {dialog.reasonHint && (
                <p id={hintId} className="-mt-1 text-xs leading-4 text-muted">
                  {dialog.reasonHint}
                </p>
              )}
              {moderation.reasons.map((option) => (
                <label
                  key={option.key}
                  className="flex cursor-pointer items-center gap-3 rounded-lg bg-surface-tint px-3 py-2 text-sm leading-5 text-ink transition-colors hover:bg-chip has-checked:bg-chip has-checked:font-semibold has-focus-visible:outline-2 has-focus-visible:outline-primary"
                >
                  <input
                    type="radio"
                    name="decline-reason"
                    value={option.key}
                    checked={moderation.reason === option.key}
                    onChange={() => {
                      moderation.chooseReason(option.key);
                    }}
                    className="size-4 cursor-pointer accent-deep-blue"
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
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
              onClick={moderation.cancel}
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
                dialog.action === "approve"
                  ? "bg-teal hover:bg-teal/90"
                  : "bg-danger hover:bg-danger/90"
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
