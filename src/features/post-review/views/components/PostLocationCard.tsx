import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { ExifLocationCheck, PostDetail } from "../../models/post";
import type { PostDetailViewModel } from "../../viewmodels/usePostDetailViewModel";

interface PostLocationCardProps {
  post: PostDetail;
  viewModel: PostDetailViewModel;
}

const exifBadgeClass: Record<ExifLocationCheck, string> = {
  verified: "bg-amber-soft text-amber-ink",
  mismatch: "bg-danger-tint text-danger",
  noGps: "bg-chip text-slate",
};

/**
 * Whether the photos' EXIF GPS matches the report, the area name when known,
 * copyable coordinates, and a map placeholder.
 */
export function PostLocationCard({ post, viewModel }: PostLocationCardProps) {
  const strings = AppStrings.posts.detail.location;
  const { location } = post;
  const exifLabel: Record<ExifLocationCheck, string> = {
    verified: strings.exifVerified,
    mismatch: strings.exifMismatch,
    noGps: strings.exifNoGps,
  };

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
          <h2
            id="post-location-heading"
            className="text-base leading-6 font-bold text-deep-blue"
          >
            {strings.heading}
          </h2>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-[14px] font-bold tracking-[0.44px] ${exifBadgeClass[location.exifCheck]}`}
        >
          {location.exifCheck === "verified" && (
            <img src={AppAssets.postDetail.iconExifVerified} alt="" />
          )}
          {exifLabel[location.exifCheck]}
        </span>
      </div>

      {location.placeName && (
        <p className="text-base leading-6 text-teal">{location.placeName}</p>
      )}

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

        <div className="absolute right-3 bottom-3">
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
