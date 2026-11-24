import { useId } from "react";
import { Modal } from "../../../../core/components/Modal";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { AdminsViewModel } from "../../viewmodels/useAdminsViewModel";

const strings = AppStrings.admins;

export const dialogButtonClass =
  "rounded-lg px-4 py-2 text-sm leading-5 font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

/** "Invite an admin": one email field. Refusals show inside. */
export function InviteAdminDialog({
  viewModel,
}: {
  viewModel: AdminsViewModel;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const errorId = useId();
  const dialog = strings.inviteDialog;

  return (
    <Modal
      isOpen={viewModel.isInviteOpen}
      onClose={viewModel.closeInvite}
      titleId={titleId}
      descriptionId={descriptionId}
    >
      <form
        noValidate
        className="flex flex-col gap-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          viewModel.submitInvite();
        }}
      >
        <h2 id={titleId} className="text-lg leading-7 font-semibold text-navy">
          {dialog.title}
        </h2>
        <p id={descriptionId} className="text-sm leading-5 text-muted-strong">
          {dialog.description}
        </p>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={inputId}
            className="text-sm leading-5 font-semibold text-navy"
          >
            {dialog.emailLabel}
          </label>
          <input
            id={inputId}
            type="email"
            autoComplete="off"
            autoFocus
            value={viewModel.inviteEmail}
            placeholder={dialog.emailPlaceholder}
            aria-invalid={viewModel.inviteError !== null}
            aria-describedby={viewModel.inviteError ? errorId : undefined}
            onChange={(event) => {
              viewModel.changeInviteEmail(event.target.value);
            }}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm leading-5 text-ink focus-visible:outline-2 focus-visible:outline-primary aria-invalid:border-danger"
          />
        </div>
        {viewModel.inviteError && (
          <p
            id={errorId}
            role="alert"
            className="rounded-lg bg-danger-tint px-3 py-2 text-sm leading-5 text-danger"
          >
            {viewModel.inviteError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={viewModel.closeInvite}
            disabled={viewModel.isInviting}
            className={`${dialogButtonClass} bg-surface-tint text-deep-blue hover:bg-chip`}
          >
            {dialog.cancel}
          </button>
          <button
            type="submit"
            disabled={viewModel.isInviting}
            aria-busy={viewModel.isInviting}
            className={`${dialogButtonClass} bg-primary text-white hover:bg-primary-hover`}
          >
            {viewModel.isInviting ? dialog.submitting : dialog.submit}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** "Remove this admin?" or "Cancel this invitation?". */
export function ConfirmAdminDialog({
  viewModel,
}: {
  viewModel: AdminsViewModel;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const pending = viewModel.confirmation;
  const confirm = strings.confirm;
  const isRemove = pending?.kind === "remove";
  const email = pending?.member.email ?? "";

  return (
    <Modal
      isOpen={pending !== null}
      onClose={viewModel.closeConfirmation}
      titleId={titleId}
      descriptionId={descriptionId}
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id={titleId} className="text-lg leading-7 font-semibold text-navy">
          {isRemove ? confirm.removeTitle : confirm.cancelTitle}
        </h2>
        <p id={descriptionId} className="text-sm leading-5 text-muted-strong">
          {(isRemove ? confirm.removeBody : confirm.cancelBody).replace(
            "{email}",
            email,
          )}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={viewModel.closeConfirmation}
            disabled={viewModel.isConfirming}
            className={`${dialogButtonClass} bg-surface-tint text-deep-blue hover:bg-chip`}
          >
            {confirm.keep}
          </button>
          <button
            type="button"
            onClick={viewModel.confirmAction}
            disabled={viewModel.isConfirming}
            aria-busy={viewModel.isConfirming}
            className={`${dialogButtonClass} bg-danger text-white hover:bg-danger/90`}
          >
            {viewModel.isConfirming
              ? confirm.working
              : isRemove
                ? confirm.removeConfirm
                : confirm.cancelConfirm}
          </button>
        </div>
      </div>
    </Modal>
  );
}
