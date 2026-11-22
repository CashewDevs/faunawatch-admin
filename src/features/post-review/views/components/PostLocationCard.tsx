import { lazy, Suspense } from "react";
import { Modal } from "../../../../core/components/Modal";
import { ScreenErrorBoundary } from "../../../../core/components/ScreenErrorBoundary";
import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { ExifLocationCheck, PostDetail } from "../../models/post";
import type { PostDetailViewModel } from "../../viewmodels/usePostDetailViewModel";
import { usePostLocationMapViewModel } from "../../viewmodels/usePostLocationMapViewModel";

// mapbox-gl is large, so it downloads only when a post's map is shown.
const PostLocationMap = lazy(() =>
  import("./PostLocationMap").then((module) => ({
    default: module.PostLocationMap,
  })),
);

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
 * copyable coordinates, and a live map of the exact spot that can open
 * full screen.
 */
export function PostLocationCard({ post, viewModel }: PostLocationCardProps) {
  const strings = AppStrings.posts.detail.location;
  const { location } = post;
  const map = usePostLocationMapViewModel(post.photos);
  const { mapToken } = map;
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
        {mapToken === null ? (
          <MapPlaceholder message={strings.mapUnavailable} />
        ) : (
          <>
            <ScreenErrorBoundary>
              <Suspense fallback={<MapPlaceholder />}>
                <PostLocationMap
                  token={mapToken}
                  latitude={location.latitude}
                  longitude={location.longitude}
                  variant="card"
                  mode="2d"
                  photoUrl={map.pinPhotoUrl}
                  label={strings.mapLabel}
                  onError={map.reportMapFailed}
                />
              </Suspense>
            </ScreenErrorBoundary>

            {/* Top-left: Mapbox's logo and credits take the bottom corners. */}
            <div className="absolute top-3 left-3">
              <button
                type="button"
                onClick={map.openFullMap}
                className="flex items-center gap-1 rounded-lg bg-deep-blue px-3 py-1.5 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-white shadow-md hover:bg-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {strings.fullMap}
                <img src={AppAssets.postDetail.iconExternalLink} alt="" />
              </button>
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={map.isFullMapOpen}
        onClose={map.closeFullMap}
        titleId="post-full-map-heading"
        size="full"
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <h2
              id="post-full-map-heading"
              className="truncate text-base leading-6 font-bold text-deep-blue"
            >
              {location.placeName ?? strings.heading}
            </h2>
            <p className="font-mono text-[13px] leading-[18px] text-slate">
              {viewModel.coordinatesLabel}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div
              role="group"
              aria-label={strings.viewModeLabel}
              className="flex rounded-lg bg-surface-tint p-1"
            >
              {(["3d", "2d"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={map.fullMapMode === mode}
                  onClick={() => {
                    map.setFullMapMode(mode);
                  }}
                  className="rounded-md px-3 py-1 text-sm font-extrabold text-deep-blue aria-pressed:bg-deep-blue aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {strings.viewMode[mode]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={map.closeFullMap}
              className="shrink-0 rounded-lg bg-surface-tint px-4 py-2 text-sm font-bold text-deep-blue hover:bg-chip focus-visible:outline-2 focus-visible:outline-primary"
            >
              {strings.fullMapClose}
            </button>
          </div>
        </div>
        {mapToken !== null && (
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-b-xl bg-chip">
            <ScreenErrorBoundary>
              <Suspense fallback={<MapPlaceholder />}>
                <PostLocationMap
                  token={mapToken}
                  latitude={location.latitude}
                  longitude={location.longitude}
                  variant="full"
                  mode={map.fullMapMode}
                  photoUrl={map.pinPhotoUrl}
                  label={strings.mapLabel}
                  onError={map.reportMapFailed}
                />
              </Suspense>
            </ScreenErrorBoundary>
          </div>
        )}
      </Modal>
    </section>
  );
}

/** The paw pin on a plain background, while the map loads or without one. */
function MapPlaceholder({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-10">
      <span
        aria-hidden="true"
        className="relative flex size-6 items-center justify-center"
      >
        <span className="absolute size-24 rounded-full bg-primary/20" />
        <span className="absolute size-14 rounded-full bg-primary/30" />
        <span className="relative flex size-6 items-center justify-center rounded-full bg-deep-blue shadow-lg">
          <img src={AppAssets.postDetail.iconMapPin} alt="" />
        </span>
      </span>
      {message && <p className="text-sm font-semibold text-slate">{message}</p>}
    </div>
  );
}
