import { ActionNotice } from "../../../../core/components/ActionNotice";
import { AppStrings } from "../../../../core/constants/appStrings";
import { formatRelativeTime } from "../../../../core/utils/formatters";
import { isInviteExpired, type AdminMember } from "../../models/adminMember";
import {
  useAdminsViewModel,
  type AdminsViewModel,
} from "../../viewmodels/useAdminsViewModel";
import {
  ConfirmAdminDialog,
  dialogButtonClass,
  InviteAdminDialog,
} from "../components/AdminDialogs";

const strings = AppStrings.admins;

const rowButtonClass =
  "rounded-lg px-3 py-1.5 text-xs leading-4 font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Admins page: who can sign in to this site, inviting new admins, and
 * resending, cancelling or removing.
 */
export function AdminsScreen() {
  const viewModel = useAdminsViewModel();

  return (
    <div className="flex flex-1 animate-fade-in flex-col gap-4 px-8 pt-5 pb-8 motion-reduce:animate-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm leading-5 text-muted-strong">
          {strings.intro}
        </p>
        <button
          type="button"
          onClick={viewModel.openInvite}
          className={`${dialogButtonClass} bg-primary text-white hover:bg-primary-hover`}
        >
          {strings.invite}
        </button>
      </div>

      <AdminsTable viewModel={viewModel} />

      <InviteAdminDialog viewModel={viewModel} />
      <ConfirmAdminDialog viewModel={viewModel} />
      <ActionNotice
        notice={viewModel.notice.notice}
        onDismiss={viewModel.notice.dismiss}
      />
    </div>
  );
}

function AdminsTable({ viewModel }: { viewModel: AdminsViewModel }) {
  if (viewModel.isLoading) {
    return (
      <p role="status" className="text-sm text-muted">
        {strings.loading}
      </p>
    );
  }
  if (viewModel.loadFailed) {
    return (
      <p
        role="alert"
        className="rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger"
      >
        {strings.loadFailed}
      </p>
    );
  }

  const columns = strings.columns;
  return (
    <div className="overflow-x-auto rounded-xl bg-white drop-shadow-xs">
      <table className="w-full min-w-180 text-left text-sm leading-5">
        <thead className="bg-surface-tint/70 text-xs leading-4 font-semibold tracking-[0.24px] text-muted-strong uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">
              {columns.admin}
            </th>
            <th scope="col" className="px-4 py-3">
              {columns.status}
            </th>
            <th scope="col" className="px-4 py-3">
              {columns.activity}
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              {columns.actions}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {viewModel.admins.map((member) => (
            <AdminRow
              key={member.userId}
              member={member}
              viewModel={viewModel}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminRow({
  member,
  viewModel,
}: {
  member: AdminMember;
  viewModel: AdminsViewModel;
}) {
  const expired = isInviteExpired(member, viewModel.now);
  const isResending = viewModel.resendingId === member.userId;
  const relative = (date: Date) =>
    formatRelativeTime(date.toISOString(), viewModel.now);

  let activity: string;
  if (member.status === "invited") {
    activity = member.invitedAt
      ? `${strings.invitedAgo} ${relative(member.invitedAt)}`
      : strings.statusInvited;
  } else {
    activity = member.lastSignInAt
      ? `${strings.lastSignIn} ${relative(member.lastSignInAt)}`
      : strings.neverSignedIn;
  }

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-navy">
            {member.name ?? member.email}
          </span>
          {member.isYou && (
            <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] leading-4 font-bold text-deep-blue">
              {strings.you}
            </span>
          )}
        </div>
        {member.name && (
          <div className="text-xs text-muted">{member.email}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={member.status} expired={expired} />
      </td>
      <td className="px-4 py-3 text-muted-strong">{activity}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          {member.status === "invited" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  viewModel.resendInvite(member);
                }}
                disabled={viewModel.resendingId !== null}
                aria-busy={isResending}
                className={`${rowButtonClass} bg-surface-tint text-deep-blue hover:bg-chip`}
              >
                {strings.actions.resend}
              </button>
              <button
                type="button"
                onClick={() => {
                  viewModel.askCancel(member);
                }}
                className={`${rowButtonClass} text-danger hover:bg-danger-tint`}
              >
                {strings.actions.cancel}
              </button>
            </>
          ) : (
            !member.isYou && (
              <button
                type="button"
                onClick={() => {
                  viewModel.askRemove(member);
                }}
                className={`${rowButtonClass} text-danger hover:bg-danger-tint`}
              >
                {strings.actions.remove}
              </button>
            )
          )}
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({
  status,
  expired,
}: {
  status: AdminMember["status"];
  expired: boolean;
}) {
  const [label, tone] =
    status === "active"
      ? [strings.statusActive, "bg-teal-soft text-teal"]
      : expired
        ? [strings.statusExpired, "bg-danger-tint text-danger"]
        : [strings.statusInvited, "bg-amber-soft text-amber-ink"];
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs leading-4 font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}
