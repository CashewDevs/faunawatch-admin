import { Link } from "react-router";
import { AppAssets } from "../../../../core/constants/appAssets";
import { postDetailPath } from "../../../../core/constants/appRoutes";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { PostDetailViewModel } from "../../viewmodels/usePostDetailViewModel";
import { PostStatusPill } from "./PostStatusPill";

interface PostDetailHeaderProps {
  viewModel: PostDetailViewModel;
}

const pagerButtonClass =
  "flex items-center gap-1 rounded bg-surface px-2.5 py-1 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-deep-blue";

/**
 * Back link, breadcrumb, review status, and Prev / Next through the queue.
 */
export function PostDetailHeader({ viewModel }: PostDetailHeaderProps) {
  const strings = AppStrings.posts.detail;
  const { post, queue, returnPath, linkState } = viewModel;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          to={returnPath}
          className="flex items-center gap-1.5 rounded-lg bg-chip px-3 py-1.5 text-xs leading-4 font-semibold tracking-[0.24px] text-deep-blue transition-colors hover:bg-avatar focus-visible:outline-2 focus-visible:outline-primary"
        >
          <img src={AppAssets.postDetail.iconBackArrow} alt="" />
          {strings.back}
        </Link>

        {post && (
          <>
            <span aria-hidden="true" className="h-4 w-px bg-border/60" />
            <nav aria-label={strings.breadcrumbLabel}>
              <ol className="flex items-center gap-2 text-[13px] leading-[18px]">
                <li>
                  <Link
                    to={returnPath}
                    className="text-slate hover:text-deep-blue focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {AppStrings.posts.heading}
                  </Link>
                </li>
                <li aria-hidden="true" className="text-slate">
                  /
                </li>
                <li
                  aria-current="page"
                  className="font-semibold text-deep-blue"
                >
                  {strings.postPrefix}
                  {post.reference}
                </li>
              </ol>
            </nav>
            <PostStatusPill status={post.status} />
          </>
        )}
      </div>

      {queue && (
        <nav
          aria-label={strings.pagerLabel}
          className="flex w-fit items-center gap-1 rounded-lg bg-chip p-1"
        >
          {queue.previousId ? (
            <Link
              to={postDetailPath(queue.previousId)}
              state={linkState}
              aria-label={strings.previousLabel}
              className={`${pagerButtonClass} drop-shadow-xs hover:bg-white focus-visible:outline-2 focus-visible:outline-primary`}
            >
              <img src={AppAssets.postDetail.iconPagerPrev} alt="" />
              {strings.previous}
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={`${pagerButtonClass} opacity-40`}
            >
              <img src={AppAssets.postDetail.iconPagerPrev} alt="" />
              {strings.previous}
            </span>
          )}
          <span className="px-2 text-[11px] leading-[14px] tracking-[0.44px] text-slate">
            {queue.position} {strings.of} {queue.total}
          </span>
          {queue.nextId ? (
            <Link
              to={postDetailPath(queue.nextId)}
              state={linkState}
              aria-label={strings.nextLabel}
              className={`${pagerButtonClass} drop-shadow-xs hover:bg-white focus-visible:outline-2 focus-visible:outline-primary`}
            >
              {strings.next}
              <img src={AppAssets.postDetail.iconPagerNext} alt="" />
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={`${pagerButtonClass} opacity-40`}
            >
              {strings.next}
              <img src={AppAssets.postDetail.iconPagerNext} alt="" />
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
