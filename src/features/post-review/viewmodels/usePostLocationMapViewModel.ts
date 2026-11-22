import { useState } from "react";
import { getMapboxToken } from "../../../core/services/mapboxConfig";

/**
 * The map on a post's Location card: whether it can be shown, and the
 * full-screen view opened by "View in full map".
 */
export function usePostLocationMapViewModel(
  token: string | null = getMapboxToken(),
) {
  const [hasFailed, setHasFailed] = useState(false);
  const [isFullMapOpen, setIsFullMapOpen] = useState(false);

  // Null when there's no usable token or the map failed to load
  // (bad token, blocked address, no WebGL); the card then says so.
  const mapToken = hasFailed ? null : token;

  return {
    mapToken,
    isFullMapOpen: isFullMapOpen && mapToken !== null,
    openFullMap: () => {
      if (mapToken !== null) setIsFullMapOpen(true);
    },
    closeFullMap: () => {
      setIsFullMapOpen(false);
    },
    reportMapFailed: () => {
      setHasFailed(true);
      setIsFullMapOpen(false);
    },
  };
}

export type PostLocationMapViewModel = ReturnType<
  typeof usePostLocationMapViewModel
>;
