import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import { AppStrings } from "../../../core/constants/appStrings";
import { isRequestChangesEnabled } from "../../../core/constants/featureFlags";
import {
  getMapboxToken,
  type MapViewMode,
} from "../../../core/services/mapboxConfig";
import type { KnownPostStatus } from "../../post-review/models/post";
import { fetchPostCoverUrls } from "../../post-review/services/postsService";
import { toPostLinkState } from "../../post-review/viewmodels/postNavigation";
import {
  allPostsQuery,
  signedUrlStaleTimeMs,
} from "../../post-review/viewmodels/postQueries";
import {
  countMapPosts,
  getMappablePosts,
  getMapStatuses,
  getSpeciesName,
  getVisiblePosts,
  parsePostsMapParams,
  toggleHiddenStatus,
  toPostsMapParams,
  type MapPin,
  type PostsMapQuery,
} from "../models/postsMap";

/**
 * The Map screen: every post as a pin, status filters with counts, the
 * 3D/2D switch, and the summary card of the pin that was clicked. Filters,
 * view and the open card live in the address bar, so a post's "Back to Map"
 * returns to the same map.
 */
export function usePostsMapViewModel(token: string | null = getMapboxToken()) {
  const strings = AppStrings.postsMap;
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [hasMapFailed, setHasMapFailed] = useState(false);
  // Bumped by "Show all pins"; the map zooms out to fit when it changes.
  const [fitAllRequest, setFitAllRequest] = useState(0);

  const statuses = getMapStatuses(isRequestChangesEnabled());
  const query = parsePostsMapParams(searchParams, statuses);

  const postsQuery = useQuery(allPostsQuery);
  const mappable = getMappablePosts(postsQuery.data ?? [], statuses);
  const counts = countMapPosts(mappable);
  const visiblePosts = getVisiblePosts(mappable, query.hidden);

  // Every pin's photo, signed in one request. Keyed on all mappable posts,
  // so switching filters doesn't sign them again.
  const coversQuery = useQuery({
    queryKey: ["posts", "covers", mappable.map((post) => post.id)],
    queryFn: () => fetchPostCoverUrls(mappable),
    enabled: mappable.length > 0,
    staleTime: signedUrlStaleTimeMs,
  });
  const coverUrls = coversQuery.data;
  const pins: MapPin[] = visiblePosts.map((post) => ({
    id: post.id,
    latitude: post.latitude,
    longitude: post.longitude,
    // Mappable posts always have an offered (known) status.
    status: post.status as KnownPostStatus,
    photoUrl: coverUrls?.get(post.id) ?? null,
    label: [
      getSpeciesName(post) ?? AppStrings.posts.category[post.category],
      AppStrings.posts.status[post.status],
    ].join(strings.pinLabelSeparator),
  }));

  // A card only opens for a pin that's on the map.
  const selectedPost =
    visiblePosts.find((post) => post.id === query.postId) ?? null;

  const update = (change: Partial<PostsMapQuery>) => {
    setSearchParams(
      (previous) =>
        toPostsMapParams({
          ...parsePostsMapParams(previous, statuses),
          ...change,
        }),
      // Filter clicks shouldn't fill the browser's history.
      { replace: true },
    );
  };

  const mapToken = hasMapFailed ? null : token;
  const hasPosts = mappable.length > 0;

  return {
    /** Null when there's no usable token or the map failed to load. */
    mapToken,
    reportMapFailed: () => {
      setHasMapFailed(true);
    },

    isLoading: postsQuery.isPending,
    isError: postsQuery.isError,
    retry: () => void postsQuery.refetch(),
    /** No post anywhere has a pin (before any filtering). */
    isEmpty: postsQuery.isSuccess && !hasPosts,
    /** Posts exist, but every one is filtered out. */
    isFilteredEmpty: hasPosts && pins.length === 0,

    statusFilters: statuses.map((status) => ({
      status,
      label: strings.statuses[status],
      count: counts[status],
      isShown: !query.hidden.includes(status),
    })),
    toggleStatus: (status: KnownPostStatus) => {
      const hidden = toggleHiddenStatus(query.hidden, status);
      // Hiding the open card's status closes the card too.
      const closesCard =
        selectedPost !== null &&
        hidden.some((hiddenStatus) => hiddenStatus === selectedPost.status);
      update(closesCard ? { hidden, postId: null } : { hidden });
    },
    showAllStatuses: () => {
      update({ hidden: [] });
    },

    pins,
    fitAllRequest,
    fitAllPins: () => {
      setFitAllRequest((count) => count + 1);
    },

    viewMode: query.view,
    setViewMode: (view: MapViewMode) => {
      update({ view });
    },

    selectedPost,
    // The card reuses its pin's photo (already downloaded for the pin).
    selectedCoverUrl: selectedPost
      ? (coverUrls?.get(selectedPost.id) ?? null)
      : null,
    isSelectedCoverLoading: selectedPost !== null && coversQuery.isPending,
    selectPost: (postId: string) => {
      update({ postId });
    },
    closeCard: () => {
      update({ postId: null });
    },
    /** Router state for "See full details", so Back returns to this map. */
    detailLinkState: toPostLinkState(location.pathname, location.search),
  };
}

export type PostsMapViewModel = ReturnType<typeof usePostsMapViewModel>;
