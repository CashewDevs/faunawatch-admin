import { useId } from "react";
import { Modal } from "../../../../core/components/Modal";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { SuspensionFlow } from "../../viewmodels/useSuspensionFlow";

interface SuspensionDialogProps {
  suspension: SuspensionFlow;
}

const buttonClass =
  "rounded-lg px-4 py-2 text-sm leading-5 font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

const optionClass =
  "flex cursor-pointer items-center gap-3 rounded-lg bg-surface-tint px-3 py-2 text-sm leading-5 text-ink transition-colors hover:bg-chip has-checked:bg-chip has-checked:font-semibold has-focus-visible:outline-2 has-focus-visible:outline-primary";

const legendClass = "mb-2 text-sm leading-5 font-bold text-deep-blue";

/**
 * Confirms suspending a user (length, reason, optional details) or
 * reactivating one (shows the suspension being lifted).
 */
export function SuspensionDialog({ suspension }: SuspensionDialogProps) {
  const strings = AppStrings.users.suspension;
  const titleId = useId();
  const bodyId = useId();
  const detailsId = useId();
  const detailsHintId = useId();
  const { dialog } = suspension;

  return (
    <Modal
      isOpen={dialog !== null}
      onClose={suspension.cancel}
      titleId={titleId}
      descriptionId={bodyId}
    >
      {dialog && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            suspension.confirm();
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

          {dialog.current && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-surface-tint px-3 py-2 text-sm leading-5">
              <dt className="font-bold text-deep-blue">
                {strings.currentReason}
              </dt>
              <dd className="break-words text-ink">{dialog.current.reason}</dd>
              <dt className="font-bold text-deep-blue">
                {strings.currentEnds}
              </dt>
              <dd className="text-ink">{dialog.current.ends}</dd>
            </dl>
          )}

          {dialog.action === "suspend" && (
            <>
              <fieldset disabled={dialog.isSaving} className="flex flex-col">
                <legend className={legendClass}>{strings.durationLabel}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {suspension.durations.map((option) => (
                    <label key={option.key} className={optionClass}>
                      <input
                        type="radio"
                        name="suspension-length"
                        value={option.key}
                        checked={suspension.duration === option.key}
                        onChange={() => {
                          suspension.chooseDuration(option.key);
                        }}
                        className="size-4 cursor-pointer accent-deep-blue"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset
                disabled={dialog.isSaving}
                className="flex flex-col gap-2"
              >
                <legend className={legendClass}>{strings.reasonLabel}</legend>
                {suspension.reasons.map((option) => (
                  <label key={option.key} className={optionClass}>
                    <input
                      type="radio"
                      name="suspension-reason"
                      value={option.key}
                      checked={suspension.reason === option.key}
                      onChange={() => {
                        suspension.chooseReason(option.key);
                      }}
                      className="size-4 cursor-pointer accent-deep-blue"
                    />
                    {option.label}
                  </label>
                ))}
              </fieldset>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor={detailsId}
                  className="text-sm leading-5 font-bold text-deep-blue"
                >
                  {dialog.detailsLabel}
                </label>
                <p id={detailsHintId} className="text-xs leading-4 text-muted">
                  {strings.detailsHint}
                </p>
                <textarea
                  id={detailsId}
                  rows={2}
                  value={suspension.details}
                  maxLength={suspension.detailsMaxLength}
                  required={dialog.needsDetails}
                  disabled={dialog.isSaving}
                  aria-describedby={detailsHintId}
                  onChange={(event) => {
                    suspension.changeDetails(event.target.value);
                  }}
                  className="mt-1 resize-y rounded-lg bg-surface-tint px-3 py-2 text-sm leading-5 text-ink placeholder:text-muted focus:outline-2 focus:outline-primary disabled:opacity-50"
                />
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
              onClick={suspension.cancel}
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
                dialog.action === "reactivate"
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
