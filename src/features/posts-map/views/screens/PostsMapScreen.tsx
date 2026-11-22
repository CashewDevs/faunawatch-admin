import { lazy, Suspense, type ReactNode } from "react";
import { ScreenErrorBoundary } from "../../../../core/components/ScreenErrorBoundary";
import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import { usePrefersReducedMotion } from "../../../../core/hooks/usePrefersReducedMotion";
import {
  usePostsMapViewModel,
  type PostsMapViewModel,
} from "../../viewmodels/usePostsMapViewModel";
import { PostMapCard } from "../components/PostMapCard";
import { PostsMapControls } from "../components/PostsMapControls";

// mapbox-gl is large, so it downloads only when the Map is opened.
const PostsMap = lazy(() =>
  import("../components/PostsMap").then((module) => ({
    default: module.PostsMap,
  })),
);

/**
 * Map: every post as a pin coloured by review status, with status filters,
 * a 3D/2D switch, and a summary card for the clicked pin that links to the
 * post's full review page.
 */
export function PostsMapScreen() {
  const strings = AppStrings.postsMap;
  const viewModel = usePostsMapViewModel();
  const reduceMotion = usePrefersReducedMotion();
  const { mapToken, selectedPost } = viewModel;

  return (
    <div className="flex flex-1 flex-col px-8 pt-5 pb-8">
      <div className="relative min-h-[520px] flex-1 animate-fade-in overflow-hidden rounded-2xl bg-chip shadow-sm ring-1 ring-navy/5 motion-reduce:animate-none">
        {mapToken === null ? (
          <MapPlaceholder message={strings.mapUnavailable} />
        ) : (
          <>
            <ScreenErrorBoundary>
              <Suspense fallback={<MapPlaceholder />}>
                <PostsMap
                  token={mapToken}
                  pins={viewModel.pins}
                  mode={viewModel.viewMode}
                  selectedId={selectedPost?.id ?? null}
                  card={
                    selectedPost && (
                      // Keyed so the card animates in again for each pin.
                      <PostMapCard
                        key={selectedPost.id}
                        post={selectedPost}
                        coverUrl={viewModel.selectedCoverUrl}
                        isCoverLoading={viewModel.isSelectedCoverLoading}
                        detailLinkState={viewModel.detailLinkState}
                        onClose={viewModel.closeCard}
                      />
                    )
                  }
                  fitAllRequest={viewModel.fitAllRequest}
                  reduceMotion={reduceMotion}
                  label={strings.mapLabel}
                  onSelect={viewModel.selectPost}
                  onClearSelection={viewModel.closeCard}
                  onError={viewModel.reportMapFailed}
                />
              </Suspense>
            </ScreenErrorBoundary>

            {/* Top-left: Mapbox's zoom buttons take the top-right corner
                and its logo and credits the bottom ones. */}
            <div className="pointer-events-none absolute inset-x-4 top-4 flex pr-14">
              <div className="pointer-events-auto">
                <PostsMapControls viewModel={viewModel} />
              </div>
            </div>

            <MapStatus viewModel={viewModel} />
          </>
        )}
      </div>
    </div>
  );
}

/** Loading, error and empty messages floating over the map. */
function MapStatus({ viewModel }: { viewModel: PostsMapViewModel }) {
  const strings = AppStrings.postsMap;

  if (viewModel.isLoading) {
    return (
      <FloatingNotice>
        <p
          aria-busy="true"
          className="flex items-center gap-2 text-sm font-semibold text-deep-blue"
        >
          <span
            aria-hidden="true"
            className="size-2 animate-ping rounded-full bg-primary motion-reduce:animate-none"
          />
          {strings.loading}
        </p>
      </FloatingNotice>
    );
  }
  if (viewModel.isError) {
    return (
      <FloatingNotice role="alert">
        <p className="text-sm font-semibold text-danger">{strings.error}</p>
        <NoticeButton onClick={viewModel.retry}>{strings.retry}</NoticeButton>
      </FloatingNotice>
    );
  }
  if (viewModel.isEmpty) {
    return (
      <FloatingNotice>
        <p className="text-sm font-semibold text-slate">{strings.empty}</p>
      </FloatingNotice>
    );
  }
  if (viewModel.isFilteredEmpty) {
    return (
      <FloatingNotice>
        <p className="text-sm font-semibold text-slate">
          {strings.filteredEmpty}
        </p>
        <NoticeButton onClick={viewModel.showAllStatuses}>
          {strings.showAll}
        </NoticeButton>
      </FloatingNotice>
    );
  }
  return null;
}

function FloatingNotice({
  children,
  role,
}: {
  children: ReactNode;
  role?: "alert";
}) {
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-10 flex justify-center">
      <div
        role={role}
        className="pointer-events-auto flex animate-fade-in-up items-center gap-4 rounded-xl bg-white/95 px-5 py-3 shadow-lg ring-1 ring-navy/5 backdrop-blur-md motion-reduce:animate-none"
      >
        {children}
      </div>
    </div>
  );
}

function NoticeButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-white shadow-button transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {children}
    </button>
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
        <span className="absolute size-24 animate-pulse rounded-full bg-primary/20 motion-reduce:animate-none" />
        <span className="absolute size-14 rounded-full bg-primary/30" />
        <span className="relative flex size-6 items-center justify-center rounded-full bg-deep-blue shadow-lg">
          <img src={AppAssets.postDetail.iconMapPin} alt="" />
        </span>
      </span>
      {message && <p className="text-sm font-semibold text-slate">{message}</p>}
    </div>
  );
}
