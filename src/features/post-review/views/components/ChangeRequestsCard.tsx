import { AppStrings } from "../../../../core/constants/appStrings";
import { useNow } from "../../../../core/hooks/useNow";
import {
  formatDateTime,
  formatRelativeTime,
} from "../../../../core/utils/formatters";
import type { ChangeRequest } from "../../models/changeRequest";
import type { PostDetailViewModel } from "../../viewmodels/usePostDetailViewModel";

interface ChangeRequestsCardProps {
  viewModel: PostDetailViewModel;
}

/**
 * Every Request changes round on the post, newest first: the message, what
 * needed fixing, who asked and when, and how it ended (or that it is still
 * waiting on the reporter). Shown only once the post has a request.
 */
export function ChangeRequestsCard({ viewModel }: ChangeRequestsCardProps) {
  const strings = AppStrings.posts.detail.changeRequests;
  const fieldStrings = AppStrings.posts.changeRequest.fields;
  const now = useNow();
  const { changeRequests } = viewModel;

  if (viewModel.isChangeRequestsError) {
    return (
      <section className="flex flex-col gap-3 rounded-xl bg-white p-6 drop-shadow-xs">
        <h2 className="text-base leading-6 font-bold text-deep-blue">
          {strings.heading}
        </h2>
        <p className="text-sm leading-5 text-muted">
          <span role="alert">{strings.loadFailed}</span>{" "}
          <button
            type="button"
            onClick={viewModel.retryChangeRequests}
            className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {strings.retry}
          </button>
        </p>
      </section>
    );
  }
  if (changeRequests.length === 0) return null;

  const adminName = (name: string | null, isFormer: boolean) =>
    isFormer ? strings.formerAdmin : (name ?? strings.unknownAdmin);

  const time = (isoDateTime: string) => (
    <time dateTime={isoDateTime} title={formatDateTime(isoDateTime)}>
      {formatRelativeTime(isoDateTime, now)}
    </time>
  );

  const outcome = (request: ChangeRequest) => {
    if (request.resolution === "resubmitted" && request.resolvedAt) {
      return (
        <>
          {strings.resubmitted} {strings.separator} {time(request.resolvedAt)}
        </>
      );
    }
    if (request.resolution === "withdrawn" && request.resolvedAt) {
      return (
        <>
          {strings.withdrawnByPrefix}{" "}
          {adminName(request.withdrawnByName, request.isWithdrawnByFormerAdmin)}{" "}
          {strings.separator} {time(request.resolvedAt)}
        </>
      );
    }
    return (
      <>
        {strings.waitingSince} {time(request.requestedAt)}
      </>
    );
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-white p-6 drop-shadow-xs">
      <h2 className="text-base leading-6 font-bold text-deep-blue">
        {strings.heading}
      </h2>
      <ul
        aria-label={strings.listLabel}
        className="flex max-h-96 flex-col gap-2 overflow-y-auto"
      >
        {changeRequests.map((request) => (
          <li
            key={request.id}
            className="flex flex-col gap-2 rounded-lg bg-surface px-3 py-2"
          >
            <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs leading-4">
              <span className="font-bold text-deep-blue">
                {strings.round} {request.round}
              </span>
              <span className="text-muted">{outcome(request)}</span>
            </p>
            <p className="text-sm leading-5 break-words whitespace-pre-wrap text-ink">
              {request.message}
            </p>
            {request.fields.length > 0 && (
              <ul
                aria-label={strings.fieldsLabel}
                className="flex flex-wrap gap-1.5"
              >
                {request.fields.map((field) => (
                  <li
                    key={field}
                    className="rounded-full bg-amber-soft px-2.5 py-0.5 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-amber-ink"
                  >
                    {fieldStrings[field]}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs leading-4 text-muted">
              {strings.requestedByPrefix}{" "}
              {adminName(
                request.requestedByName,
                request.isRequestedByFormerAdmin,
              )}{" "}
              {strings.separator} {time(request.requestedAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
