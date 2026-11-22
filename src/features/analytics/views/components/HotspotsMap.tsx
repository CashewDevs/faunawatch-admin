import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createMapMarkerButton } from "../../../../core/components/mapMarkerButton";
import { AppStrings } from "../../../../core/constants/appStrings";
import { MAPBOX_STYLE_URL } from "../../../../core/services/mapboxConfig";
import { formatNumber } from "../../../../core/utils/formatters";
import { getMapBounds } from "../../../../core/utils/mapBounds";
import type { DensityLevel, MappedHotspot } from "../../models/analytics";
import { densityBg, densityHaloBg } from "./analyticsColors";

interface HotspotsMapProps {
  token: string;
  /** Quietest first, so the busiest are drawn on top. */
  hotspots: readonly MappedHotspot[];
  /** Changes each time "Show all" is pressed. */
  fitAllRequest: number;
  /** Jumps instead of gliding for viewers who asked for reduced motion. */
  reduceMotion: boolean;
  label: string;
  onError: () => void;
}

interface HotspotEntry {
  marker: mapboxgl.Marker;
  element: HTMLButtonElement;
}

/** Roughly the whole Philippines, shown while the hotspots load. */
const START_CENTER: [number, number] = [122.5, 12.3];
const START_ZOOM = 4.2;
/** Keeps circles and their bubbles clear of the card's edges and buttons. */
const FIT_PADDING = { top: 96, bottom: 48, left: 72, right: 72 };
/** About town level, so a single area still shows what's around it. */
const FIT_MAX_ZOOM = 10;
const FIT_DURATION_MS = 1000;

/** Circle sizes, matching the old panel: busier tiers draw bigger. */
const haloSize: Record<DensityLevel, string> = {
  low: "size-8",
  moderate: "size-11",
  high: "size-14",
  critical: "size-17",
};

/**
 * A small, flat live Mapbox map for the Sighting Hotspots card, styled like
 * the other maps (Standard, day lighting). Each hotspot is a density circle
 * at the average spot of its area's reports (see `SightingHotspot`), named
 * by the area's centre. Hovering, focusing or clicking a circle shows its
 * area, report count and density. Circles are redrawn when the category
 * changes, since each category has its own spot. Loaded
 * lazily from the Hotspots tab, so mapbox-gl downloads only there.
 */
export function HotspotsMap({
  token,
  hotspots,
  fitAllRequest,
  reduceMotion,
  label,
  onError,
}: HotspotsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const entriesRef = useRef(new Map<string, HotspotEntry>());
  const openIdRef = useRef<string | null>(null);
  const hasFittedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  const reportError = useEffectEvent(onError);
  const readHotspots = useEffectEvent(() => hotspots);
  const readReduceMotion = useEffectEvent(() => reduceMotion);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container,
        accessToken: token,
        style: MAPBOX_STYLE_URL,
        config: {
          basemap: { lightPreset: "day", show3dObjects: false },
        },
        center: START_CENTER,
        zoom: START_ZOOM,
        // Flat 2D only: no tilting or turning.
        pitch: 0,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        // Plain scrolling scrolls the page; Ctrl (⌘) + scroll zooms the map,
        // and Mapbox says so when someone scrolls over it.
        cooperativeGestures: true,
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
    map.touchZoomRotate.disableRotation();
    const entries = entriesRef.current;

    // Errors before the first load mean the map can't work (bad or
    // restricted token, style unreachable). Later ones are single tiles.
    let hasLoaded = false;
    map.once("load", () => {
      hasLoaded = true;
      setIsReady(true);
    });
    map.on("error", () => {
      if (!hasLoaded) reportError();
    });

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    // A click on empty map closes an open bubble; clicks on a circle bubble
    // up here too, so they're let through.
    map.on("click", (event) => {
      const target = event.originalEvent.target;
      if (target instanceof Element && target.closest("[data-hotspot]")) {
        return;
      }
      openBubble(entries, openIdRef, null);
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") openBubble(entries, openIdRef, null);
    };
    container.addEventListener("keydown", onKeyDown);

    // The card's width changes with the window, so keep the map sized to it.
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("keydown", onKeyDown);
      entries.clear();
      mapRef.current = null;
      openIdRef.current = null;
      hasFittedRef.current = false;
      setIsReady(false);
      map.remove();
    };
  }, [token]);

  // Redraws the circles when the hotspots change (new range or category),
  // then frames them: at once the first time, gliding after that.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;
    const entries = entriesRef.current;

    for (const entry of entries.values()) entry.marker.remove();
    entries.clear();
    openIdRef.current = null;

    for (const hotspot of hotspots) {
      const element = createHotspotElement(hotspot, () => {
        openBubble(
          entries,
          openIdRef,
          openIdRef.current === hotspot.id ? null : hotspot.id,
        );
      });
      const marker = new mapboxgl.Marker({ element, anchor: "center" })
        .setLngLat([hotspot.longitude, hotspot.latitude])
        .addTo(map);
      entries.set(hotspot.id, { marker, element });
    }

    const bounds = getMapBounds(hotspots);
    if (!bounds) return;
    const shouldGlide = hasFittedRef.current && !readReduceMotion();
    hasFittedRef.current = true;
    map.fitBounds(bounds, {
      padding: FIT_PADDING,
      maxZoom: FIT_MAX_ZOOM,
      duration: shouldGlide ? FIT_DURATION_MS : 0,
    });
  }, [hotspots, isReady]);

  // "Show all": zoom back out (or in) to fit every hotspot.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fitAllRequest === 0) return;
    const bounds = getMapBounds(readHotspots());
    if (!bounds) return;
    map.fitBounds(bounds, {
      padding: FIT_PADDING,
      maxZoom: FIT_MAX_ZOOM,
      duration: readReduceMotion() ? 0 : FIT_DURATION_MS,
    });
  }, [fitAllRequest]);

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
 * One hotspot: a density-coloured dot in a soft halo. It's a button, so it
 * can be reached from the keyboard; its bubble shows on hover, on keyboard
 * focus, and stays open after a click. The text is set with textContent,
 * never as HTML.
 */
function createHotspotElement(
  hotspot: MappedHotspot,
  onClick: () => void,
): HTMLButtonElement {
  const strings = AppStrings.analytics.hotspots;
  const detail = [
    `${formatNumber(hotspot.sightingCount)} ${strings.sightingsSuffix}`,
    strings.density[hotspot.density],
  ].join(strings.detailSeparator);

  const element = createMapMarkerButton(`${hotspot.name}: ${detail}`, onClick);
  element.dataset.hotspot = hotspot.id;
  element.dataset.open = "false";
  element.className = `group block ${haloSize[hotspot.density]} cursor-pointer rounded-full hover:z-10 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[open=true]:z-10`;

  const halo = document.createElement("span");
  halo.className = `relative flex size-full animate-fade-in items-center justify-center rounded-full motion-reduce:animate-none ${densityHaloBg[hotspot.density]}`;

  const dot = document.createElement("span");
  dot.className = `size-3.5 rounded-full ring-2 ring-white ${densityBg[hotspot.density]}`;

  const bubble = document.createElement("span");
  // The button's label already says all of this to screen readers.
  bubble.setAttribute("aria-hidden", "true");
  bubble.className =
    "pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 flex-col gap-0.5 rounded-lg bg-white px-3 py-1.5 text-left whitespace-nowrap shadow-md ring-1 ring-navy/5 group-hover:flex group-focus-visible:flex group-data-[open=true]:flex";

  const title = document.createElement("span");
  title.className =
    "flex items-center gap-1.5 text-sm leading-5 font-semibold text-ink";
  const titleDot = document.createElement("span");
  titleDot.className = `size-2.5 shrink-0 rounded-full ${densityBg[hotspot.density]}`;
  title.append(titleDot, document.createTextNode(hotspot.name));

  const subtitle = document.createElement("span");
  subtitle.className = "text-xs leading-4 font-semibold text-slate";
  subtitle.textContent = detail;

  bubble.append(title, subtitle);
  halo.append(dot, bubble);
  element.append(halo);
  return element;
}

/** Keeps one hotspot's bubble open after a click (null closes it). */
function openBubble(
  entries: ReadonlyMap<string, HotspotEntry>,
  openIdRef: { current: string | null },
  id: string | null,
) {
  openIdRef.current = id;
  for (const [entryId, entry] of entries) {
    entry.element.dataset.open = String(entryId === id);
  }
}
