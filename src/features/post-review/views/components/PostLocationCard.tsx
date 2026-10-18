import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { PostDetail } from "../../models/post";
import type { PostDetailViewModel } from "../../viewmodels/usePostDetailViewModel";

interface PostLocationCardProps {
  post: PostDetail;
  viewModel: PostDetailViewModel;
}

/**
 * Address, EXIF verification, copyable coordinates, and a map preview with
 * the AI's recommended public blur radius.
 */
export function PostLocationCard({ post, viewModel }: PostLocationCardProps) {
  const strings = AppStrings.posts.detail.location;
  const { location } = post;

  return (
    <section
      aria-labelledby="post-location-heading"
      className="flex flex-col gap-4 rounded-xl bg-white p-6 drop-shadow-xs"
    >
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-avatar">
            <img src={AppAssets.postDetail.iconLocation} alt="" />
          </span>
          <div className="flex flex-col">
            <h2
              id="post-location-heading"
              className="text-base leading-6 font-bold text-deep-blue"
            >
              {strings.heading}
            </h2>
            <p className="text-[13px] leading-[18px] text-slate">
              {location.address}
            </p>
          </div>
        </div>
        {location.isExifVerified && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-soft px-2.5 py-1 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-amber-ink">
            <img src={AppAssets.postDetail.iconExifVerified} alt="" />
            {strings.exifVerified}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-tint px-3.5 py-2.5">
        <p className="flex items-center gap-2 font-mono text-[13px] leading-[18px] text-deep-blue">
          <img
            src={AppAssets.postDetail.iconCoordinates}
            alt=""
            className="shrink-0"
          />
          {viewModel.coordinatesLabel}
          {location.elevationMeters !== null &&
            ` (${strings.elevationPrefix} ${String(location.elevationMeters)}m)`}
        </p>
        <button
          type="button"
          aria-label={strings.copyLabel}
          onClick={viewModel.copyCoordinates}
          className="flex items-center gap-1 rounded px-1 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-deep-blue hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <img src={AppAssets.postDetail.iconCopy} alt="" />
          <span aria-live="polite">
            {viewModel.isCopied ? strings.copied : strings.copy}
          </span>
        </button>
      </div>

      <div className="relative h-64 overflow-hidden rounded-xl bg-chip shadow-[inset_0_2px_4px_0_rgb(0_0_0/0.05)]">
        {location.mapPreviewUrl && (
          <img
            src={location.mapPreviewUrl}
            alt={strings.mapAlt}
            className="size-full object-cover"
          />
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="relative flex size-6 items-center justify-center">
            <span className="absolute size-24 rounded-full bg-primary/20" />
            <span className="absolute size-14 rounded-full bg-primary/30" />
            <span className="relative flex size-6 items-center justify-center rounded-full bg-deep-blue shadow-lg">
              <img src={AppAssets.postDetail.iconMapPin} alt="" />
            </span>
          </span>
        </div>

        <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2">
          {location.recommendedBufferKm !== null ? (
            <span className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-teal shadow-md backdrop-blur-[4px]">
              <img src={AppAssets.postDetail.iconBuffer} alt="" />
              {location.recommendedBufferKm}
              {strings.kilometersSuffix} {strings.bufferSuffix}
            </span>
          ) : (
            <span />
          )}
          {/* TODO(map): Opening an external map would send the sighting's
              exact coordinates (possibly of an endangered species) to a
              third party. Decide on a map provider and whether to blur
              coordinates first. */}
          <button
            type="button"
            disabled
            title={strings.fullMapUnavailable}
            className="flex cursor-not-allowed items-center gap-1 rounded-lg bg-deep-blue px-3 py-1.5 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-white shadow-md"
          >
            {strings.fullMap}
            <img src={AppAssets.postDetail.iconExternalLink} alt="" />
          </button>
        </div>
      </div>
    </section>
  );
}
