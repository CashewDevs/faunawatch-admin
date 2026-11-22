import { Link } from "react-router";
import { AppAssets } from "../../../../core/constants/appAssets";
import { postDetailPath } from "../../../../core/constants/appRoutes";
import { AppStrings } from "../../../../core/constants/appStrings";
import { formatDate } from "../../../../core/utils/formatters";
import type { PostSummary } from "../../../post-review/models/post";
import type { PostLinkState } from "../../../post-review/viewmodels/postNavigation";
import { PostStatusPill } from "../../../post-review/views/components/PostStatusPill";
import { getSpeciesName } from "../../models/postsMap";

interface PostMapCardProps {
  post: PostSummary;
  coverUrl: string | null;
  isCoverLoading: boolean;
  detailLinkState: PostLinkState;
  onClose: () => void;
}

/**
 * The small card above a clicked pin: photo, status, species, category,
 * area, date and reporter, and a button to the post's full review page.
 */
export function PostMapCard({
  post,
  coverUrl,
  isCoverLoading,
  detailLinkState,
  onClose,
}: PostMapCardProps) {
  const strings = AppStrings.postsMap.card;
  const category = AppStrings.posts.category[post.category];
  const title = getSpeciesName(post) ?? category;

  return (
    <article
      aria-label={strings.label}
      className="relative w-72 origin-bottom animate-card-in cursor-auto motion-reduce:animate-none"
    >
      <div className="overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-navy/5">
        <div className="relative h-32 bg-chip">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="size-full animate-fade-in object-cover"
            />
          ) : isCoverLoading ? (
            <div className="size-full animate-pulse bg-surface-tint" />
          ) : (
            <div className="flex size-full items-center justify-center bg-surface-tint">
              <img
                src={AppAssets.shared.pinLogo}
                alt=""
                className="w-12 opacity-80"
              />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-deep-blue/40 via-deep-blue/0 via-50% to-deep-blue/0" />
          <div className="absolute top-2.5 left-2.5">
            <PostStatusPill status={post.status} />
          </div>
          <button
            type="button"
            aria-label={strings.close}
            onClick={onClose}
            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-white/90 text-lg leading-none text-deep-blue shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="min-w-0">
            <h3 className="truncate text-base leading-6 font-bold text-deep-blue">
              {title}
            </h3>
            <p className="truncate text-xs leading-4 text-slate">
              {category} · {strings.postPrefix}
              {post.reference}
            </p>
          </div>

          <div className="flex flex-col gap-1.5 text-xs leading-4 text-slate">
            <p className="flex items-center gap-1.5">
              <img
                src={AppAssets.postApprovals.iconLocationPin}
                alt=""
                className="shrink-0"
              />
              <span className="truncate">
                {post.placeName ?? strings.unknownPlace}
              </span>
            </p>
            <p className="truncate">
              {formatDate(post.submittedAt)}
              {post.reporter.fullName &&
                ` · ${strings.reporterPrefix} ${post.reporter.fullName}`}
            </p>
          </div>

          <Link
            to={postDetailPath(post.id)}
            state={detailLinkState}
            className="group flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-button transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {strings.seeDetails}
            <span
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        </div>
      </div>
      {/* Points down at the pin. */}
      <span
        aria-hidden="true"
        className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 rounded-br-xs bg-white"
      />
    </article>
  );
}
