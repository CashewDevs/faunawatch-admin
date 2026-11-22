import { useState } from "react";
import { getMapboxToken } from "../../../core/services/mapboxConfig";
import { getPinPhotoUrl, type PostPhoto } from "../models/post";

/** "3d" tilts the camera and shows buildings, like the app; "2d" is flat. */
export type MapViewMode = "3d" | "2d";

/**
 * The map on a post's Location card: whether it can be shown, and the
 * full-screen view opened by "View in full map" with its 3D/2D switch.
 */
export function usePostLocationMapViewModel(
  photos: readonly Pick<PostPhoto, "url">[],
  token: string | null = getMapboxToken(),
) {
  const [hasFailed, setHasFailed] = useState(false);
  const [isFullMapOpen, setIsFullMapOpen] = useState(false);
  const [fullMapMode, setFullMapMode] = useState<MapViewMode>("3d");

  // Null when there's no usable token or the map failed to load
  // (bad token, blocked address, no WebGL); the card then says so.
  const mapToken = hasFailed ? null : token;

  return {
    mapToken,
    pinPhotoUrl: getPinPhotoUrl(photos),
    isFullMapOpen: isFullMapOpen && mapToken !== null,
    fullMapMode,
    openFullMap: () => {
      if (mapToken === null) return;
      // Always opens in 3D, the app's default.
      setFullMapMode("3d");
      setIsFullMapOpen(true);
    },
    closeFullMap: () => {
      setIsFullMapOpen(false);
    },
    setFullMapMode,
    reportMapFailed: () => {
      setHasFailed(true);
      setIsFullMapOpen(false);
    },
  };
}

export type PostLocationMapViewModel = ReturnType<
  typeof usePostLocationMapViewModel
>;
