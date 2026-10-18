import { Link, useLocation } from "react-router";
import { AppAssets } from "../../../../core/constants/appAssets";
import { postDetailPath } from "../../../../core/constants/appRoutes";
import { AppStrings } from "../../../../core/constants/appStrings";
import { useNow } from "../../../../core/hooks/useNow";
import { formatRelativeTime } from "../../../../core/utils/formatters";
import {
  getExtraPhotoCount,
  type PostSeverity,
  type PostSummary,
} from "../../models/post";
import { toPostLinkState } from "../../viewmodels/postNavigation";
import { ReporterAvatar } from "./ReporterAvatar";

interface PostCardProps {
  post: PostSummary;
  /** Shows the select checkbox when provided. */
  isSelected?: boolean;
  onToggleSelect?: (postId: string) => void;
  /** Shows Decline / Approve on pending posts when provided. */
  onApprove?: (postId: string) => void;
  onDecline?: (postId: string) => void;
  /** False renders the moderation buttons disabled. */
  isModerationAvailable?: boolean;
}

const severityBadgeClass: Record<PostSeverity, string> = {
  high: "bg-danger text-white",
  medium: "bg-cyan text-ink",
  low: "bg-chip text-deep-blue",
};

const actionButtonClass =
  "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-base leading-6 transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed";

/**
 * A post's summary card. The whole card links to the post's review page
 * (one real link stretched over the card, so the checkbox and buttons
 * stay separately clickable). Selection and moderation are optional.
 */
export function PostCard({
  post,
  isSelected = false,
  onToggleSelect,
  onApprove,
  onDecline,
  isModerationAvailable = true,
}: PostCardProps) {
  const strings = AppStrings.posts;
  const location = useLocation();
  const now = useNow();
  const coverUrl = post.photoUrls[0];
  const extraPhotos = getExtraPhotoCount(post);
  const isPending = post.status === "pending";
  const showActions = isPending && (onApprove ?? onDecline);
  const confidence = `${String(post.aiMatch.confidencePercent)}%`;

  return (
    <article className="relative flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-xs transition-shadow hover:shadow-md has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-primary">
      <div className="relative h-48 shrink-0 bg-chip">
        {coverUrl && (
          <img src={coverUrl} alt="" className="size-full object-cover" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-deep-blue/70 via-deep-blue/0 via-50% to-deep-blue/0" />

        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] leading-[14px] font-bold tracking-[0.55px] uppercase drop-shadow-xs ${severityBadgeClass[post.severity]}`}
            >
              {strings.severity[post.severity]} {strings.severitySuffix}
            </span>
            {post.isInvasive && (
              <span className="flex items-center gap-1 rounded-full bg-cyan px-2.5 py-1 text-[11px] leading-[14px] font-bold tracking-[0.55px] text-ink uppercase drop-shadow-xs">
                <img src={AppAssets.postApprovals.iconInvasive} alt="" />
                {strings.card.invasive}
              </span>
            )}
          </div>
          {onToggleSelect && (
            <label className="relative z-10 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md bg-white/90 shadow-xs">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {
                  onToggleSelect(post.id);
                }}
                aria-label={`${strings.card.select}: ${post.title}`}
                className="size-4 cursor-pointer accent-deep-blue"
              />
            </label>
          )}
        </div>

        {extraPhotos > 0 && (
          <span className="absolute right-3 bottom-3 flex items-center gap-1 rounded-md bg-badge-navy/80 px-2 py-0.5 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-badge-text">
            <img src={AppAssets.postApprovals.iconPhotoCount} alt="" />+
            {extraPhotos}
            <span className="sr-only"> {strings.card.morePhotos}</span>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 p-5">
        <p className="flex items-center gap-1.5 text-base leading-6 text-teal">
          <img
            src={AppAssets.postApprovals.iconLocationPin}
            alt=""
            className="shrink-0"
          />
          <span className="truncate">{post.locationName}</span>
        </p>
        <h3 className="line-clamp-2 text-lg leading-[22.5px] font-semibold tracking-[-0.09px] text-deep-blue">
          <Link
            to={postDetailPath(post.id)}
            state={toPostLinkState(location.pathname, location.search)}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {post.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm leading-5 text-slate">
          {post.description}
        </p>
        <p
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs leading-4 font-semibold tracking-[0.24px] ${
            post.isInvasive
              ? "bg-cyan/30 text-ink"
              : "bg-surface-tint text-deep-blue"
          }`}
        >
          <img
            src={
              post.isInvasive
                ? AppAssets.postApprovals.iconAiInvasive
                : AppAssets.postApprovals.iconAiSparkle
            }
            alt=""
            className="shrink-0"
          />
          <span className="truncate">
            {strings.card.aiPrefix} {post.aiMatch.commonName}
            {post.isInvasive
              ? ` ${strings.card.invasiveSuffix}, ${confidence}`
              : `, ${confidence} ${strings.card.matchSuffix}`}
          </span>
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-6 pb-5">
        <div className="flex items-center justify-between gap-3 bg-surface-tint/50 px-5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <ReporterAvatar reporter={post.reporter} size="sm" />
            <div className="flex min-w-0 flex-col text-[13px] leading-[16.25px]">
              <span className="truncate text-deep-blue">
                {post.reporter.fullName}
              </span>
              <span className="truncate text-muted">
                {post.reporter.role} •{" "}
                {formatRelativeTime(post.submittedAt, now)}
              </span>
            </div>
          </div>
          <span
            aria-hidden="true"
            className="shrink-0 text-[13px] leading-[19.5px] text-deep-blue"
          >
            {strings.card.review}
          </span>
        </div>

        <div className="flex gap-2 px-5">
          {showActions ? (
            <>
              {onDecline && (
                <button
                  type="button"
                  disabled={!isModerationAvailable}
                  title={
                    isModerationAvailable
                      ? undefined
                      : strings.moderationUnavailable
                  }
                  onClick={() => {
                    onDecline(post.id);
                  }}
                  className={`${actionButtonClass} text-danger hover:bg-danger-tint disabled:hover:bg-transparent`}
                >
                  <img src={AppAssets.shared.iconDecline} alt="" />
                  {strings.card.decline}
                </button>
              )}
              {onApprove && (
                <button
                  type="button"
                  disabled={!isModerationAvailable}
                  title={
                    isModerationAvailable
                      ? undefined
                      : strings.moderationUnavailable
                  }
                  onClick={() => {
                    onApprove(post.id);
                  }}
                  className={`${actionButtonClass} bg-teal text-white hover:bg-teal/90 disabled:hover:bg-teal`}
                >
                  <img src={AppAssets.shared.iconApprove} alt="" />
                  {strings.card.approve}
                </button>
              )}
            </>
          ) : (
            <span
              className={`rounded-full px-3 py-1 text-[11px] leading-[14px] font-bold tracking-[0.44px] ${
                post.status === "declined"
                  ? "bg-danger-tint text-danger"
                  : post.status === "approved"
                    ? "bg-teal-soft text-teal"
                    : "bg-cyan/50 text-teal"
              }`}
            >
              {strings.status[post.status]}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
