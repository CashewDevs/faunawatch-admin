import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useEffectEvent, useRef } from "react";
import { AppAssets } from "../../../../core/constants/appAssets";
import { MAPBOX_STYLE_URL } from "../../../../core/services/mapboxConfig";

interface PostLocationMapProps {
  token: string;
  latitude: number;
  longitude: number;
  /** "card" keeps page scrolling free; "full" lets the wheel zoom. */
  variant: "card" | "full";
  label: string;
  onError: () => void;
}

/**
 * A live Mapbox map centred on the post's exact spot, with the paw pin.
 * Loaded lazily (see PostLocationCard) so mapbox-gl only downloads when a
 * post is opened.
 */
export function PostLocationMap({
  token,
  latitude,
  longitude,
  variant,
  label,
  onError,
}: PostLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reportError = useEffectEvent(onError);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container,
        accessToken: token,
        style: MAPBOX_STYLE_URL,
        center: [longitude, latitude],
        zoom: variant === "full" ? 16 : 14,
        scrollZoom: variant === "full",
      });
    } catch {
      // No WebGL in this browser.
      reportError();
      return;
    }

    // Errors before the first load mean the map can't work (bad or
    // restricted token, style unreachable). Later ones are single tiles.
    let hasLoaded = false;
    map.once("load", () => {
      hasLoaded = true;
    });
    map.on("error", () => {
      if (!hasLoaded) reportError();
    });

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    const pin = document.createElement("span");
    pin.className =
      "flex size-8 items-center justify-center rounded-full bg-deep-blue shadow-lg ring-4 ring-primary/30";
    const pinIcon = document.createElement("img");
    pinIcon.src = AppAssets.postDetail.iconMapPin;
    pinIcon.alt = "";
    pin.append(pinIcon);
    new mapboxgl.Marker({ element: pin })
      .setLngLat([longitude, latitude])
      .addTo(map);

    // The full map's dialog opens after this runs, so keep the map sized
    // to its box.
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.remove();
    };
  }, [token, latitude, longitude, variant]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={label}
      className="absolute inset-0"
    />
  );
}
