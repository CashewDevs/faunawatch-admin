import { AppAssets } from "../constants/appAssets";

/**
 * The app's map pin (map_pin_image.dart), 52 x 64: a coloured round head
 * with the post's photo cropped into it, and a pointer whose tip marks the
 * spot. Without a photo, or when it fails to load, the head shows the logo,
 * like the app. Used by every Mapbox map in the admin; keep it in step with
 * the app's pin.
 */
export function createMapPin({
  photoUrl,
  fillClass = "bg-map-pin",
  className = "",
}: {
  photoUrl: string | null;
  /** The frame and pointer colour; the app's blue unless given. */
  fillClass?: string;
  className?: string;
}): {
  pin: HTMLElement;
  /** Swaps the photo in the head, e.g. once it has been signed. */
  setPhoto: (url: string | null) => void;
} {
  const pin = document.createElement("div");
  pin.className = `relative h-16 w-[52px] ${className}`;

  const pointer = document.createElement("span");
  pointer.className = `absolute top-[42px] left-[19px] h-[22px] w-3.5 [clip-path:polygon(0_0,100%_0,50%_100%)] ${fillClass}`;

  const head = document.createElement("span");
  head.className = `absolute top-0.5 left-[3px] flex size-[46px] items-center justify-center overflow-hidden rounded-full ${fillClass}`;

  const image = document.createElement("img");
  image.alt = "";
  image.draggable = false;
  // Pins off screen don't download their photo until they come into view.
  image.loading = "lazy";
  image.decoding = "async";

  let shownUrl: string | null | undefined;
  let isShowingLogo = false;
  const showLogo = () => {
    isShowingLogo = true;
    image.src = AppAssets.shared.pinLogo;
    image.className = "w-[34px]";
  };
  const setPhoto = (url: string | null) => {
    if (url === shownUrl) return;
    shownUrl = url;
    if (url) {
      isShowingLogo = false;
      image.src = url;
      image.className = "size-[41px] rounded-full object-cover";
    } else {
      showLogo();
    }
  };
  image.addEventListener("error", () => {
    // A photo that fails falls back to the logo (never retried in a loop).
    if (!isShowingLogo) showLogo();
  });
  setPhoto(photoUrl);

  head.append(image);
  pin.append(pointer, head);
  return { pin, setPhoto };
}
