import { useId } from "react";
import { Modal } from "../../../../core/components/Modal";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { ChangeRequestFlow } from "../../viewmodels/useChangeRequestFlow";

interface ChangeRequestDialogProps {
  changeRequest: ChangeRequestFlow;
}

const buttonClass =
  "rounded-lg px-4 py-2 text-sm leading-5 font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

const optionClass =
  "flex cursor-pointer items-center gap-3 rounded-lg bg-surface-tint px-3 py-2 text-sm leading-5 text-ink transition-colors hover:bg-chip has-checked:bg-chip has-checked:font-semibold has-focus-visible:outline-2 has-focus-visible:outline-primary";

/**
 * Confirms sending a pending post back to the reporter (what needs fixing,
 * and a message they will read), or withdrawing that request (no reason).
 */
export function ChangeRequestDialog({
  changeRequest,
}: ChangeRequestDialogProps) {
  const strings = AppStrings.posts.changeRequest;
  const titleId = useId();
  const bodyId = useId();
  const messageId = useId();
  const messageHintId = useId();
  const { dialog } = changeRequest;

  return (
    <Modal
      isOpen={dialog !== null}
      onClose={changeRequest.cancel}
      titleId={titleId}
      descriptionId={bodyId}
    >
      {dialog && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            changeRequest.confirm();
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
            {dialog.hint && (
              <p className="text-sm leading-5 font-semibold text-teal">
                {dialog.hint}
              </p>
            )}
          </div>

          {dialog.needsMessage && (
            <>
              <fieldset disabled={dialog.isSaving} className="flex flex-col">
                <legend className="mb-2 text-sm leading-5 font-bold text-deep-blue">
                  {strings.fieldsLabel}
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {changeRequest.fields.map((field) => (
                    <label key={field.key} className={optionClass}>
                      <input
                        type="checkbox"
                        name="change-request-field"
                        value={field.key}
                        checked={field.isChecked}
                        onChange={() => {
                          changeRequest.toggleField(field.key);
                        }}
                        className="size-4 cursor-pointer accent-deep-blue"
                      />
                      {field.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor={messageId}
                  className="text-sm leading-5 font-bold text-deep-blue"
                >
                  {strings.messageLabel}
                </label>
                <p id={messageHintId} className="text-xs leading-4 text-muted">
                  {strings.messageHint}
                </p>
                <textarea
                  id={messageId}
                  rows={4}
                  value={changeRequest.message}
                  maxLength={changeRequest.messageMaxLength}
                  required
                  disabled={dialog.isSaving}
                  aria-describedby={messageHintId}
                  onChange={(event) => {
                    changeRequest.changeMessage(event.target.value);
                  }}
                  className="mt-1 resize-y rounded-lg bg-surface-tint px-3 py-2 text-sm leading-5 text-ink placeholder:text-muted focus:outline-2 focus:outline-primary disabled:opacity-50"
                />
                {/* Always mounted, so screen readers announce the count. */}
                <p
                  aria-live="polite"
                  className="text-right text-xs leading-4 text-muted"
                >
                  {changeRequest.messageLengthLabel}
                </p>
              </div>
            </>
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
              onClick={changeRequest.cancel}
              disabled={dialog.isSaving}
              className={`${buttonClass} bg-surface-tint text-deep-blue hover:bg-chip`}
            >
              {strings.cancel}
            </button>
            <button
              type="submit"
              disabled={!dialog.canConfirm}
              aria-busy={dialog.isSaving}
              className={`${buttonClass} bg-primary text-white hover:bg-primary-hover`}
            >
              {dialog.confirmLabel}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
