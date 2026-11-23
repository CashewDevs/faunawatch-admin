import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import {
  formatDate,
  formatDateTime,
  formatNumber,
} from "../../../../core/utils/formatters";
import type { AdminUser } from "../../models/adminUser";
import { canChangeSuspension } from "../../models/suspension";
import { UserAvatar } from "./UserAvatar";

interface UserTableRowProps {
  user: AdminUser;
  /** Opens the suspend or reactivate dialog. */
  onToggleStatus: (user: AdminUser) => void;
}

/** Grid cell: fills its row height so row tints have no gaps. */
const cellClass = "flex items-center";

/**
 * One user row: identity, email, join date, post count, and account status.
 * The status switch asks to suspend or reactivate; it is locked for admins.
 * A "Deletion scheduled" badge shows when the user asked to delete their
 * account in the app.
 * Rendered inside UserTable's grid (the row itself is `display: contents`).
 */
export function UserTableRow({ user, onToggleStatus }: UserTableRowProps) {
  const strings = AppStrings.users.table;
  const isSuspended = user.status === "suspended";
  const name = user.fullName || strings.unnamed;
  const isLocked = !canChangeSuspension(user);
  // "Suspended · Locked"; just "Suspended" when the level isn't known.
  const statusLabel =
    isSuspended && user.suspensionLevel
      ? `${strings.status.suspended}${strings.levelSeparator}${
          AppStrings.users.suspension.levels[user.suspensionLevel]
        }`
      : strings.status[user.status];

  return (
    <tr
      role="row"
      className={`contents ${isSuspended ? "*:bg-danger-soft/10" : ""}`}
    >
      <td role="cell" className={`${cellClass} gap-2 py-3 pr-4 pl-6`}>
        <UserAvatar user={user} />
        <div className="flex flex-col">
          <span className="flex items-center gap-1 text-sm leading-5 font-bold tracking-[0.14px] whitespace-nowrap text-navy">
            {name}
            {user.isVerified && (
              <img
                src={AppAssets.users.iconVerified}
                alt={strings.verified}
                title={strings.verified}
                className="shrink-0"
              />
            )}
          </span>
          <span
            className={`text-xs leading-[18px] whitespace-nowrap ${
              isSuspended ? "font-medium text-danger" : "text-muted"
            }`}
          >
            {user.username && `@${user.username}`}
            {isSuspended && `${user.username ? " " : ""}${strings.sanctioned}`}
          </span>
        </div>
      </td>
      <td
        role="cell"
        className={`${cellClass} px-4 text-sm leading-5 whitespace-nowrap text-slate`}
      >
        {user.email ?? strings.noEmail}
      </td>
      <td
        role="cell"
        className={`${cellClass} px-4 text-sm leading-5 whitespace-nowrap text-muted`}
      >
        {formatDate(user.joinedAt)}
      </td>
      <td role="cell" className={`${cellClass} px-4`}>
        <span className="rounded-lg bg-surface-tint px-2 py-1 text-xs leading-4 font-semibold tracking-[0.24px] whitespace-nowrap text-navy">
          {formatNumber(user.postCount)}{" "}
          {user.postCount === 1 ? strings.postSuffix : strings.postsSuffix}
        </span>
      </td>
      <td role="cell" className={`${cellClass} justify-end gap-3 pr-6 pl-4`}>
        {user.deletionScheduledFor && (
          <span
            title={`${strings.deletionScheduledHint.before}${formatDateTime(
              user.deletionScheduledFor,
            )}${strings.deletionScheduledHint.after}`}
            className="rounded-full bg-amber-soft px-3 py-1 text-[11px] leading-[14px] font-bold tracking-[0.44px] whitespace-nowrap text-amber-ink"
          >
            {`${strings.deletionScheduled}${strings.levelSeparator}${formatDate(
              user.deletionScheduledFor,
            )}`}
          </span>
        )}
        <span
          className={`rounded-full px-3 py-1 text-[11px] leading-[14px] font-bold tracking-[0.44px] whitespace-nowrap ${
            isSuspended
              ? "bg-danger-tint text-danger"
              : "bg-teal-soft text-teal"
          }`}
        >
          {statusLabel}
        </span>
        {/* The switch shows the current status; the dialog changes it. */}
        <button
          type="button"
          role="switch"
          aria-checked={!isSuspended}
          aria-label={`${strings.toggleStatus}: ${name}${
            isLocked ? ` (${strings.adminLocked})` : ""
          }`}
          title={isLocked ? strings.adminLocked : undefined}
          disabled={isLocked}
          onClick={() => {
            onToggleStatus(user);
          }}
          className={`flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${
            isSuspended ? "justify-start bg-border pl-1" : "justify-end bg-teal"
          }`}
        >
          <span className="size-5 rounded-full bg-white shadow-xs" />
        </button>
      </td>
    </tr>
  );
}
