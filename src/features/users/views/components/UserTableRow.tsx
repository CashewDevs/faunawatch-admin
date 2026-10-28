import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import { formatDate, formatNumber } from "../../../../core/utils/formatters";
import type { AdminUser } from "../../models/adminUser";
import { UserAvatar } from "./UserAvatar";

interface UserTableRowProps {
  user: AdminUser;
}

/** Grid cell: fills its row height so row tints have no gaps. */
const cellClass = "flex items-center";

/**
 * One user row: identity, email, join date, post count, and account status.
 * Rendered inside UserTable's grid (the row itself is `display: contents`).
 */
export function UserTableRow({ user }: UserTableRowProps) {
  const strings = AppStrings.users.table;
  const isSuspended = user.status === "suspended";
  const name = user.fullName || strings.unnamed;

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
        <span
          className={`rounded-full px-3 py-1 text-[11px] leading-[14px] font-bold tracking-[0.44px] ${
            isSuspended
              ? "bg-danger-tint text-danger"
              : "bg-teal-soft text-teal"
          }`}
        >
          {strings.status[user.status]}
        </span>
        {/* TODO(moderation): Suspend/reactivate needs the confirm modals from
            Figma and a backend status column + admin RLS policy. Visual only. */}
        <button
          type="button"
          role="switch"
          aria-checked={!isSuspended}
          aria-label={`${strings.toggleStatus}: ${name}`}
          disabled
          className={`flex h-6 w-11 shrink-0 cursor-not-allowed items-center rounded-full p-0.5 ${
            isSuspended ? "justify-start bg-border pl-1" : "justify-end bg-teal"
          }`}
        >
          <span className="size-5 rounded-full bg-white shadow-xs" />
        </button>
      </td>
    </tr>
  );
}
