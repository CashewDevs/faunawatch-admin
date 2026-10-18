import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import { toSafeLinkUrl } from "../../../../core/utils/urls";
import type { PostDetail } from "../../models/post";
import type { PostDetailViewModel } from "../../viewmodels/usePostDetailViewModel";

interface PostGalleryProps {
  post: PostDetail;
  viewModel: PostDetailViewModel;
}

const overlayBadgeClass =
  "absolute flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] leading-[14px] tracking-[0.44px]";

const arrowButtonClass =
  "absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 shadow-lg transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-primary";

/**
 * Main photo with camera settings, flash check, zoom, and arrows, plus a
 * thumbnail strip when there are several photos.
 */
export function PostGallery({ post, viewModel }: PostGalleryProps) {
  const strings = AppStrings.posts.detail.gallery;
  const { photoIndex, photoCount, currentPhotoUrl } = viewModel;
  const zoomUrl = currentPhotoUrl ? toSafeLinkUrl(currentPhotoUrl) : undefined;
  const flash = post.ai.usedArtificialFlash;

  return (
    <section
      aria-label={strings.label}
      className="flex flex-col gap-4 rounded-xl bg-white p-5 drop-shadow-xs"
    >
      <div className="relative h-80 overflow-hidden rounded-lg bg-chip">
        {currentPhotoUrl && (
          <img
            src={currentPhotoUrl}
            alt={`${strings.photo} ${String(photoIndex + 1)} / ${String(photoCount)}: ${post.aiMatch.commonName}`}
            className="size-full object-cover"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-deep-blue/60 via-deep-blue/0 via-50% to-deep-blue/20" />

        {post.fieldNotes.cameraSettings && (
          <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-deep-blue/70 px-2.5 py-1 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-white backdrop-blur-[6px]">
            <img src={AppAssets.postDetail.iconCamera} alt="" />
            <span className="sr-only">{strings.cameraSettings}: </span>
            {post.fieldNotes.cameraSettings}
          </span>
        )}

        {zoomUrl && (
          <a
            href={zoomUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={strings.zoom}
            className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-lg bg-deep-blue/70 shadow-md backdrop-blur-[6px] transition-colors hover:bg-deep-blue/90 focus-visible:outline-2 focus-visible:outline-white"
          >
            <img src={AppAssets.postDetail.iconZoom} alt="" />
          </a>
        )}

        {photoCount > 1 && (
          <>
            <button
              type="button"
              aria-label={strings.previous}
              onClick={viewModel.showPreviousPhoto}
              className={`${arrowButtonClass} left-3`}
            >
              <img src={AppAssets.postDetail.iconGalleryPrev} alt="" />
            </button>
            <button
              type="button"
              aria-label={strings.next}
              onClick={viewModel.showNextPhoto}
              className={`${arrowButtonClass} right-3`}
            >
              <img src={AppAssets.postDetail.iconGalleryNext} alt="" />
            </button>
          </>
        )}

        {flash === false && (
          <span
            className={`${overlayBadgeClass} bottom-3 left-3 bg-amber/80 font-bold text-amber-soft backdrop-blur-[4px]`}
          >
            <img src={AppAssets.postDetail.iconFlashOff} alt="" />
            {strings.noFlash}
          </span>
        )}
        {flash === true && (
          <span
            className={`${overlayBadgeClass} bottom-3 left-3 bg-danger/80 font-bold text-white backdrop-blur-[4px]`}
          >
            {strings.flashUsed}
          </span>
        )}

        {photoCount > 0 && (
          <span
            aria-hidden="true"
            className={`${overlayBadgeClass} right-3 bottom-3 bg-deep-blue/80 font-semibold text-white backdrop-blur-[4px]`}
          >
            {photoIndex + 1} / {photoCount}
          </span>
        )}
      </div>

      {photoCount > 1 && (
        <ul className="flex flex-wrap gap-3">
          {post.photoUrls.map((url, index) => {
            const isCurrent = index === photoIndex;
            return (
              <li key={`${url}-${String(index)}`}>
                <button
                  type="button"
                  aria-label={`${strings.photo} ${String(index + 1)}`}
                  aria-current={isCurrent ? "true" : undefined}
                  onClick={() => {
                    viewModel.showPhoto(index);
                  }}
                  className={`relative block aspect-4/3 w-[118.5px] overflow-hidden rounded-lg bg-chip transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isCurrent
                      ? "shadow-xs ring-2 ring-primary"
                      : "opacity-75 hover:opacity-100"
                  }`}
                >
                  <img src={url} alt="" className="size-full object-cover" />
                  {isCurrent && (
                    <span className="absolute inset-0 bg-deep-blue/10" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
