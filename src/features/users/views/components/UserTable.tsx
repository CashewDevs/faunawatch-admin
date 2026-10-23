import type { ReactNode } from "react";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { UserManagementViewModel } from "../../viewmodels/useUserManagementViewModel";
import { UserTableRow } from "./UserTableRow";

interface UserTableProps {
  viewModel: UserManagementViewModel;
}

const headerCellClass =
  "pt-[16.5px] pb-[17.5px] text-[11px] leading-[14px] font-bold tracking-[0.55px] text-navy uppercase";

/**
 * Six-column users table with loading, empty, and error states, spanning
 * the full width with evenly spaced columns.
 */
export function UserTable({ viewModel }: UserTableProps) {
  const strings = AppStrings.users;
  const { users, isLoading, isError } = viewModel;

  let body: ReactNode;
  if (isLoading) {
    body = <MessageRow>{strings.loading}</MessageRow>;
  } else if (isError) {
    body = (
      <MessageRow>
        <span role="alert">{strings.error}</span>{" "}
        <button
          type="button"
          onClick={viewModel.retry}
          className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {strings.retry}
        </button>
      </MessageRow>
    );
  } else if (users.length === 0) {
    body = <MessageRow>{strings.empty}</MessageRow>;
  } else {
    body = users.map((user) => (
      <UserTableRow
        key={user.id}
        user={user}
        isUpdatingRole={viewModel.updatingRoleUserId === user.id}
        onRoleChange={(role) => {
          viewModel.changeRole(user.id, role);
        }}
      />
    ));
  }

  return (
    <div className="overflow-x-auto">
      {viewModel.isRoleUpdateError && (
        <p role="alert" className="px-6 pb-3 text-sm text-danger">
          {strings.roleUpdateError}
        </p>
      )}
      {/* Grid instead of table layout: the first five columns are sized to
          their content and share the leftover width equally, so the gaps
          between columns stay even at any screen width. ARIA roles keep the
          table semantics that `display: grid/contents` can drop. */}
      <table
        role="table"
        aria-label={strings.table.caption}
        aria-busy={isLoading}
        className="grid w-full min-w-225 grid-cols-[repeat(5,auto)_max-content]"
      >
        <thead role="rowgroup" className="contents">
          <tr role="row" className="contents *:bg-surface-tint/70">
            <th
              role="columnheader"
              scope="col"
              className={`pr-4 pl-6 text-left ${headerCellClass}`}
            >
              {strings.table.user}
            </th>
            <th
              role="columnheader"
              scope="col"
              className={`px-4 text-left ${headerCellClass}`}
            >
              {strings.table.email}
            </th>
            <th
              role="columnheader"
              scope="col"
              className={`px-4 text-left ${headerCellClass}`}
            >
              {strings.table.joined}
            </th>
            <th
              role="columnheader"
              scope="col"
              className={`px-4 text-left ${headerCellClass}`}
            >
              {strings.table.posts}
            </th>
            <th
              role="columnheader"
              scope="col"
              className={`px-4 text-left ${headerCellClass}`}
            >
              {strings.table.role}
            </th>
            <th
              role="columnheader"
              scope="col"
              className={`pr-6 pl-4 text-right ${headerCellClass}`}
            >
              {strings.table.accountStatus}
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup" className="contents">
          {body}
        </tbody>
      </table>
    </div>
  );
}

function MessageRow({ children }: { children: ReactNode }) {
  return (
    <tr role="row" className="contents">
      <td
        role="cell"
        colSpan={6}
        className="col-span-full py-16 text-center text-sm text-muted"
      >
        {children}
      </td>
    </tr>
  );
}
