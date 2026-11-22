import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { createMapPin } from "../../../../core/components/mapPin";
import {
  MAP_PITCH_3D,
  MAPBOX_STYLE_URL,
  type MapViewMode,
} from "../../../../core/services/mapboxConfig";
import { getPinBounds, type MapPin } from "../../models/postsMap";
import { mapStatusFill } from "./mapStatusColors";

interface PostsMapProps {
  token: string;
  pins: readonly MapPin[];
  /** 3D tilts the camera and shows buildings, like the app's map. */
  mode: MapViewMode;
  selectedId: string | null;
  /** The summary card, drawn above the selected pin. */
  card: ReactNode;
  /** Changes each time "Show all pins" is pressed. */
  fitAllRequest: number;
  /** Skips camera flights for viewers who asked for reduced motion. */
  reduceMotion: boolean;
  label: string;
  onSelect: (postId: string) => void;
  onClearSelection: () => void;
  onError: () => void;
}

interface PinEntry {
  pin: MapPin;
  marker: mapboxgl.Marker;
  /** The part that animates; Mapbox moves the marker element itself. */
  inner: HTMLElement;
  setPhoto: (url: string | null) => void;
}

/** Roughly the whole Philippines, shown while the posts load. */
const START_CENTER: [number, number] = [122.5, 12.3];
const START_ZOOM = 4.8;
/** Keeps pins clear of the floating controls at the top. */
const FIT_PADDING = { top: 120, bottom: 60, left: 60, right: 60 };
const FIT_MAX_ZOOM = 14;
const SELECT_MIN_ZOOM = 13;
/** Puts a selected pin below the centre so its card fits above it. */
const SELECT_OFFSET: [number, number] = [0, 150];
/** Lifts the card above the selected pin (64px tall, enlarged 1.25x). */
const CARD_OFFSET: [number, number] = [0, -88];
const PIN_OUT_MS = 220;
/** Pins landing together drop in a little after one another. */
const pinStaggerClasses = [
  "[animation-delay:0ms]",
  "[animation-delay:60ms]",
  "[animation-delay:120ms]",
  "[animation-delay:180ms]",
  "[animation-delay:240ms]",
  "[animation-delay:300ms]",
] as const;

/**
 * A live Mapbox map with a pin for every post, styled like the app's map
 * (Standard, day lighting). Clicking a pin glides to it and opens the
 * summary card above it; clicking the map or pressing Escape closes it.
 * Loaded lazily from the Map screen, so mapbox-gl downloads only there.
 */
export function PostsMap({
  token,
  pins,
  mode,
  selectedId,
  card,
  fitAllRequest,
  reduceMotion,
  label,
  onSelect,
  onClearSelection,
  onError,
}: PostsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const cardMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const pinEntriesRef = useRef(new Map<string, PinEntry>());
  const hasFittedRef = useRef(false);
  const focusedIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  // The card is drawn by React into this element, which Mapbox keeps
  // above the selected pin as the map moves.
  const [cardElement] = useState(() => {
    const element = document.createElement("div");
    element.className = "z-20";
    return element;
  });

  const reportError = useEffectEvent(onError);
  const select = useEffectEvent(onSelect);
  const clearSelection = useEffectEvent(onClearSelection);
  const readStartMode = useEffectEvent(() => mode);
  const readPins = useEffectEvent(() => pins);
  const readReduceMotion = useEffectEvent(() => reduceMotion);

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
        center: START_CENTER,
        zoom: START_ZOOM,
        pitch: is3d ? MAP_PITCH_3D : 0,
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
    const pinEntries = pinEntriesRef.current;

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
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right",
    );

    const cardMarker = new mapboxgl.Marker({
      element: cardElement,
      anchor: "bottom",
      offset: CARD_OFFSET,
    });
    // Mapbox labels every marker and makes it a tab stop; the card has its
    // own label and controls.
    cardElement.removeAttribute("aria-label");
    cardElement.removeAttribute("tabindex");
    cardMarkerRef.current = cardMarker;

    // A click on empty map closes the card; clicks on a pin or inside the
    // card bubble up here too, so they're let through.
    map.on("click", (event) => {
      const target = event.originalEvent.target;
      if (
        target instanceof Element &&
        (target.closest("[data-map-pin]") || cardElement.contains(target))
      ) {
        return;
      }
      clearSelection();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearSelection();
    };
    container.addEventListener("keydown", onKeyDown);

    // The map fills the screen's flexible area, so keep it sized to it.
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("keydown", onKeyDown);
      pinEntries.clear();
      cardMarkerRef.current = null;
      mapRef.current = null;
      hasFittedRef.current = false;
      focusedIdRef.current = null;
      setIsReady(false);
      map.remove();
    };
  }, [token, cardElement]);

  // Adds new pins (they drop in) and removes filtered-out ones (they
  // shrink away), keeping the pins that stay where they are.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;
    const entries = pinEntriesRef.current;
    const shouldAnimate = !readReduceMotion();
    const nextById = new Map(pins.map((pin) => [pin.id, pin]));

    for (const [id, entry] of entries) {
      const next = nextById.get(id);
      // A pin whose status or spot changed is redrawn.
      if (
        !next ||
        next.status !== entry.pin.status ||
        next.latitude !== entry.pin.latitude ||
        next.longitude !== entry.pin.longitude
      ) {
        entries.delete(id);
        removePin(entry, shouldAnimate);
      } else if (next.photoUrl !== entry.pin.photoUrl) {
        // The photo arrived (or was re-signed): swap it in without
        // dropping the pin in again.
        entries.set(id, updatePinPhoto(entry, next));
      }
    }

    let landing = 0;
    for (const pin of pins) {
      if (entries.has(pin.id)) continue;
      const stagger =
        pinStaggerClasses[landing % pinStaggerClasses.length] ??
        pinStaggerClasses[0];
      landing += 1;
      const { element, inner, setPhoto } = createPinElement(
        pin,
        stagger,
        () => {
          select(pin.id);
        },
      );
      const marker = new mapboxgl.Marker({ element, anchor: "bottom" })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(map);
      entries.set(pin.id, { pin, marker, inner, setPhoto });
    }
  }, [pins, isReady]);

  // The first time pins are known, glide from the whole country to fit
  // them. When a card was already open (e.g. back from a post), the
  // selection effect below flies to that pin instead.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady || hasFittedRef.current) return;
    const bounds = getPinBounds(pins);
    if (!bounds) return;
    hasFittedRef.current = true;
    if (selectedId !== null && pins.some((pin) => pin.id === selectedId)) {
      return;
    }
    map.fitBounds(bounds, {
      padding: FIT_PADDING,
      maxZoom: FIT_MAX_ZOOM,
      duration: readReduceMotion() ? 0 : 1800,
    });
  }, [pins, isReady, selectedId]);

  // "Show all pins": zoom out (or in) to fit every pin on the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fitAllRequest === 0) return;
    const bounds = getPinBounds(readPins());
    if (!bounds) return;
    map.fitBounds(bounds, {
      padding: FIT_PADDING,
      maxZoom: FIT_MAX_ZOOM,
      duration: readReduceMotion() ? 0 : 1200,
    });
  }, [fitAllRequest]);

  // Highlights the selected pin, places the card above it, and glides
  // there when the selection changes.
  useEffect(() => {
    const map = mapRef.current;
    const cardMarker = cardMarkerRef.current;
    if (!map || !cardMarker || !isReady) return;

    const selected = pins.find((pin) => pin.id === selectedId) ?? null;
    markSelectedPin(pinEntriesRef.current, selected?.id ?? null);

    if (!selected) {
      cardMarker.remove();
      focusedIdRef.current = null;
      return;
    }
    cardMarker.setLngLat([selected.longitude, selected.latitude]);
    // addTo() re-inserts the card, which would replay its animation and
    // drop keyboard focus, so only add it when it isn't on the map yet.
    if (!cardElement.isConnected) cardMarker.addTo(map);

    if (focusedIdRef.current === selected.id) return;
    focusedIdRef.current = selected.id;
    const camera = {
      center: [selected.longitude, selected.latitude] as [number, number],
      zoom: Math.max(map.getZoom(), SELECT_MIN_ZOOM),
      offset: SELECT_OFFSET,
    };
    if (readReduceMotion()) {
      map.easeTo({ ...camera, duration: 0 });
    } else {
      map.flyTo({ ...camera, speed: 1.4, maxDuration: 2000, essential: true });
    }
  }, [pins, selectedId, isReady, cardElement]);

  // Switching 3D/2D: tilt the camera and show or hide the 3D buildings.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;
    const is3d = mode === "3d";
    map.setConfigProperty("basemap", "show3dObjects", is3d);
    map.easeTo({
      pitch: is3d ? MAP_PITCH_3D : 0,
      duration: readReduceMotion() ? 0 : 800,
    });
  }, [mode, isReady]);

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
      {createPortal(card, cardElement)}
    </div>
  );
}

/**
 * The app's photo pin (see createMapPin) with its frame and pointer in the
 * status colour. It's a button, so pins can be reached and opened from the
 * keyboard.
 */
function createPinElement(
  pin: MapPin,
  staggerClass: string,
  onClick: () => void,
): {
  element: HTMLButtonElement;
  inner: HTMLElement;
  setPhoto: (url: string | null) => void;
} {
  const fill = mapStatusFill[pin.status];

  const element = document.createElement("button");
  element.type = "button";
  element.dataset.mapPin = "";
  element.setAttribute("aria-label", pin.label);
  element.className =
    "block h-16 w-[52px] cursor-pointer rounded-full drop-shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";
  element.addEventListener("click", onClick);

  const inner = document.createElement("span");
  inner.dataset.selected = "false";
  inner.className = `group relative block size-full origin-bottom animate-pin-in transition-transform duration-300 ease-out hover:scale-110 data-[selected=true]:scale-125 motion-reduce:animate-none motion-reduce:transition-none ${staggerClass}`;

  // A soft pulse behind the selected pin's head.
  const halo = document.createElement("span");
  halo.className = `absolute top-0.5 left-[3px] hidden size-[46px] animate-ping rounded-full opacity-40 group-data-[selected=true]:block motion-reduce:animate-none ${fill}`;

  const { pin: graphic, setPhoto } = createMapPin({
    photoUrl: pin.photoUrl,
    fillClass: fill,
  });

  inner.append(halo, graphic);
  element.append(inner);
  return { element, inner, setPhoto };
}

/** Shows a pin's new photo and remembers it. */
function updatePinPhoto(entry: PinEntry, pin: MapPin): PinEntry {
  entry.setPhoto(pin.photoUrl);
  return { ...entry, pin };
}

/** Enlarges the selected pin and keeps it above its neighbours. */
function markSelectedPin(
  entries: ReadonlyMap<string, PinEntry>,
  selectedId: string | null,
) {
  for (const [id, entry] of entries) {
    const isSelected = id === selectedId;
    entry.inner.dataset.selected = String(isSelected);
    entry.marker.getElement().classList.toggle("z-10", isSelected);
  }
}

/** Shrinks a pin away (or drops it at once with reduced motion). */
function removePin(entry: PinEntry, shouldAnimate: boolean) {
  const element = entry.marker.getElement();
  element.removeAttribute("data-map-pin");
  if (!shouldAnimate) {
    entry.marker.remove();
    return;
  }
  // No longer clickable while it shrinks.
  element.tabIndex = -1;
  element.classList.add("pointer-events-none");
  entry.inner.className = entry.inner.className
    .split(" ")
    .filter(
      (name) => name !== "animate-pin-in" && !name.startsWith("[animation"),
    )
    .concat("animate-pin-out")
    .join(" ");
  window.setTimeout(() => {
    entry.marker.remove();
  }, PIN_OUT_MS);
}
