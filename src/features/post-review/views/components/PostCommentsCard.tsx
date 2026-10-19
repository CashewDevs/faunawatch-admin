import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import { useNow } from "../../../../core/hooks/useNow";
import {
  getAvatarTone,
  getInitials,
  type AvatarTone,
} from "../../../../core/utils/names";
import {
  formatNumber,
  formatRelativeTime,
} from "../../../../core/utils/formatters";
import {
  type CommentSort,
  type PostComment,
  type PostDetail,
} from "../../models/post";
import type { PostDetailViewModel } from "../../viewmodels/usePostDetailViewModel";
import { ScientificText } from "./ScientificText";

interface PostCommentsCardProps {
  post: PostDetail;
  viewModel: PostDetailViewModel;
}

const commentSorts: readonly CommentSort[] = ["newest", "oldest"];

const avatarToneClass: Record<AvatarTone, string> = {
  primary: "bg-primary",
  amber: "bg-amber",
  teal: "bg-teal",
};

const moderationButtonClass =
  "flex cursor-not-allowed items-center gap-1 rounded px-2.5 py-1 text-[11px] leading-[14px] tracking-[0.44px]";

/**
 * Community comments with sort, flagged-comment moderation, and
 * show more / fewer.
 */
export function PostCommentsCard({ post, viewModel }: PostCommentsCardProps) {
  const strings = AppStrings.posts.detail.comments;
  const now = useNow();

  return (
    <section
      aria-labelledby="post-comments-heading"
      className="flex flex-col gap-5 rounded-xl bg-white p-6 drop-shadow-xs"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2
            id="post-comments-heading"
            className="text-base leading-6 font-bold text-deep-blue"
          >
            {strings.heading}
          </h2>
          <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-deep-blue">
            {formatNumber(viewModel.commentCount)}
          </span>
        </div>
        {viewModel.commentCount > 1 && (
          <label className="flex items-center gap-2 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-slate">
            {strings.sortPrefix}
            <span className="relative">
              <select
                aria-label={strings.sortLabel}
                value={viewModel.commentSort}
                onChange={(event) => {
                  const sort = commentSorts.find(
                    (option) => option === event.target.value,
                  );
                  if (sort) viewModel.changeCommentSort(sort);
                }}
                className="min-w-[120px] cursor-pointer appearance-none rounded-lg bg-chip py-1 pr-7 pl-3.5 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-deep-blue focus:outline-2 focus:outline-primary"
              >
                {commentSorts.map((sort) => (
                  <option key={sort} value={sort}>
                    {strings.sort[sort]}
                  </option>
                ))}
              </select>
              <img
                src={AppAssets.postDetail.iconChevronDown}
                alt=""
                className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
              />
            </span>
          </label>
        )}
      </div>

      {viewModel.commentCount === 0 ? (
        <p className="text-sm text-muted">{strings.empty}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {viewModel.comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              scientificName={post.aiMatch.scientificName}
              timeLabel={formatRelativeTime(comment.postedAt, now)}
            />
          ))}
        </ul>
      )}

      {viewModel.commentCount > viewModel.comments.length ||
      viewModel.showAllComments ? (
        <button
          type="button"
          aria-expanded={viewModel.showAllComments}
          onClick={viewModel.toggleComments}
          className="flex items-center justify-center gap-1 rounded-lg bg-chip py-2.5 text-xs leading-4 font-semibold tracking-[0.24px] text-deep-blue transition-colors hover:bg-avatar focus-visible:outline-2 focus-visible:outline-primary"
        >
          {viewModel.showAllComments
            ? strings.showFewer
            : `${strings.showMore} (${String(viewModel.hiddenCommentCount)})`}
          <img
            src={AppAssets.postDetail.iconChevronDown}
            alt=""
            className={viewModel.showAllComments ? "rotate-180" : undefined}
          />
        </button>
      ) : null}
    </section>
  );
}

interface CommentItemProps {
  comment: PostComment;
  scientificName: string;
  timeLabel: string;
}

function CommentItem({ comment, scientificName, timeLabel }: CommentItemProps) {
  const strings = AppStrings.posts;
  const commentStrings = strings.detail.comments;
  const tone = getAvatarTone(comment.authorName);

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl p-4 ${
        comment.isFlagged ? "bg-cyan/30" : "bg-surface-tint"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className={`flex size-9 shrink-0 items-center justify-center rounded-full text-base leading-6 text-white ${avatarToneClass[tone]}`}
          >
            {getInitials(comment.authorName).charAt(0)}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base leading-6 font-bold text-deep-blue">
                {comment.authorName}
              </span>
              <span className="text-[13px] leading-[18px] text-slate">
                @{comment.username}
              </span>
              <span
                aria-hidden="true"
                className="size-1 rounded-full bg-border"
              />
              <span className="text-[11px] leading-[14px] font-bold tracking-[0.44px] text-slate">
                {timeLabel}
              </span>
            </div>
            {comment.isFlagged && (
              <span className="flex w-fit items-center gap-1 rounded-full bg-cyan px-2 py-0.5 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-ink">
                <img src={AppAssets.postDetail.iconFlag} alt="" />
                {commentStrings.flagged}
              </span>
            )}
            <p className="text-sm leading-5 break-words text-ink">
              <ScientificText
                text={comment.body}
                scientificName={scientificName}
              />
            </p>
          </div>
        </div>

        {/* TODO(moderation): Deleting comments and resolving flags need a
            comments table, a flag/report model, and admin RLS policies.
            Visual only until then. */}
        {comment.isFlagged ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled
              title={strings.moderationUnavailable}
              className={`${moderationButtonClass} bg-surface font-bold text-danger`}
            >
              <img src={AppAssets.postDetail.iconRemove} alt="" />
              {commentStrings.remove}
            </button>
            <button
              type="button"
              disabled
              title={strings.moderationUnavailable}
              className={`${moderationButtonClass} bg-cyan font-semibold text-ink`}
            >
              <img src={AppAssets.postDetail.iconReviewFlag} alt="" />
              {commentStrings.reviewFlag}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled
            aria-label={`${commentStrings.delete} ${comment.authorName}`}
            title={strings.moderationUnavailable}
            className="flex shrink-0 cursor-not-allowed items-center justify-center p-1"
          >
            <img src={AppAssets.postDetail.iconDelete} alt="" />
          </button>
        )}
      </div>

      {comment.moderationNote && (
        <p className="ml-12 flex items-center gap-1.5 rounded bg-chip/60 px-3 py-1.5 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-teal">
          <img
            src={AppAssets.postDetail.iconInfo}
            alt=""
            className="shrink-0"
          />
          {commentStrings.moderationNote} {comment.moderationNote}
        </p>
      )}
    </li>
  );
}
