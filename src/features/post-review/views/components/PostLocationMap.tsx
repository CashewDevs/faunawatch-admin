import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useEffectEvent, useRef } from "react";
import { AppAssets } from "../../../../core/constants/appAssets";
import {
  MAP_PITCH_3D,
  MAPBOX_STYLE_URL,
  type MapViewMode,
} from "../../../../core/services/mapboxConfig";

interface PostLocationMapProps {
  token: string;
  latitude: number;
  longitude: number;
  /** "card" keeps page scrolling free; "full" lets the wheel zoom. */
  variant: "card" | "full";
  /** 3D tilts the camera and shows buildings, like the app's map. */
  mode: MapViewMode;
  /** The post's first photo, shown in the pin; null shows the logo. */
  photoUrl: string | null;
  label: string;
  onError: () => void;
}

/**
 * A live Mapbox map centred on the post's exact spot, styled like the app's
 * map (Standard, day lighting) with the app's photo pin. Loaded lazily (see
 * PostLocationCard) so mapbox-gl only downloads when a post is opened.
 */
export function PostLocationMap({
  token,
  latitude,
  longitude,
  variant,
  mode,
  photoUrl,
  label,
  onError,
}: PostLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const reportError = useEffectEvent(onError);
  // Read once when the map is created; later changes go through the
  // mode effect below instead of rebuilding the map.
  const readStartMode = useEffectEvent(() => mode);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const is3d = readStartMode() === "3d";
    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container,
        accessToken: token,
        style: MAPBOX_STYLE_URL,
        config: {
          basemap: { lightPreset: "day", show3dObjects: is3d },
        },
        center: [longitude, latitude],
        zoom: variant === "full" ? 16 : 14,
        pitch: is3d ? MAP_PITCH_3D : 0,
        scrollZoom: variant === "full",
        // Don't send Mapbox speed reports. The required map-load report
        // still goes out (blocked by privacy browsers like Brave; harmless).
        performanceMetricsCollection: false,
      });
    } catch {
      // No WebGL in this browser.
      reportError();
      return;
    }
    mapRef.current = map;

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

    new mapboxgl.Marker({
      element: createPinElement(photoUrl),
      anchor: "bottom",
    })
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
      mapRef.current = null;
      map.remove();
    };
  }, [token, latitude, longitude, variant, photoUrl]);

  // Switching 3D/2D: tilt the camera and show or hide the 3D buildings.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const is3d = mode === "3d";
    const apply = () => {
      map.setConfigProperty("basemap", "show3dObjects", is3d);
      map.easeTo({ pitch: is3d ? MAP_PITCH_3D : 0 });
    };
    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("style.load", apply);
    }
  }, [mode]);

  // Mapbox's stylesheet gives the map element position: relative, which
  // would override `absolute inset-0` and collapse it to 0px tall. So the
  // wrapper fills the box and the map fills the wrapper.
  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        role="region"
        aria-label={label}
        className="size-full"
      />
    </div>
  );
}

/**
 * The app's map pin (map_pin_image.dart), 52 x 64: a blue round head with
 * the photo cropped into it, and a pointer whose tip marks the spot. A
 * photo that fails to load falls back to the logo, like the app.
 */
function createPinElement(photoUrl: string | null): HTMLElement {
  const pin = document.createElement("div");
  pin.className = "relative h-16 w-[52px] drop-shadow-md";

  const pointer = document.createElement("span");
  pointer.className =
    "absolute top-[42px] left-[19px] h-[22px] w-3.5 bg-map-pin [clip-path:polygon(0_0,100%_0,50%_100%)]";

  const head = document.createElement("span");
  head.className =
    "absolute top-0.5 left-[3px] flex size-[46px] items-center justify-center overflow-hidden rounded-full bg-map-pin";

  const image = document.createElement("img");
  image.alt = "";
  image.draggable = false;
  const showLogo = () => {
    image.src = AppAssets.shared.pinLogo;
    image.className = "w-[34px]";
  };
  if (photoUrl) {
    image.src = photoUrl;
    image.className = "size-[41px] rounded-full object-cover";
    image.addEventListener("error", showLogo, { once: true });
  } else {
    showLogo();
  }

  head.append(image);
  pin.append(pointer, head);
  return pin;
}
