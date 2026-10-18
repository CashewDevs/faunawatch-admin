import { useEffect, useState } from "react";

export interface AssetPreloaderOptions {
  /** Keep the loader visible at least this long so it never just flashes. */
  minDurationMs?: number;
  /** Stop waiting after this long so a slow or broken asset can't block the app. */
  timeoutMs?: number;
}

const DEFAULT_MIN_DURATION_MS = 600;
const DEFAULT_TIMEOUT_MS = 8000;
// Shared so the default keeps a stable identity and doesn't re-run the effect.
const NO_FONTS: readonly string[] = [];

/** Fetches and decodes an image so it paints instantly when first shown. */
async function preloadImage(url: string): Promise<void> {
  const image = new Image();
  image.src = url;
  await image.decode();
}

/** Asks the browser to load a font face, e.g. `400 1em "Plus Jakarta Sans"`. */
async function preloadFont(descriptor: string): Promise<void> {
  if (!("fonts" in document)) return;
  await document.fonts.load(descriptor);
}

/**
 * Preloads images and fonts before the app is shown.
 *
 * Returns `true` once every asset has loaded (or failed), the minimum
 * duration has passed, or the timeout is hit. Failed assets never block.
 * Pass stable (module-level) arrays so the effect does not re-run.
 */
export function useAssetPreloader(
  imageUrls: readonly string[],
  fontDescriptors: readonly string[] = NO_FONTS,
  {
    minDurationMs = DEFAULT_MIN_DURATION_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: AssetPreloaderOptions = {},
): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(setTimeout(resolve, ms));
      });

    const assetsLoaded = Promise.allSettled([
      ...imageUrls.map(preloadImage),
      ...fontDescriptors.map(preloadFont),
    ]);

    void Promise.all([
      Promise.race([assetsLoaded, wait(timeoutMs)]),
      wait(minDurationMs),
    ]).then(() => {
      if (!isCancelled) setIsReady(true);
    });

    return () => {
      isCancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [imageUrls, fontDescriptors, minDurationMs, timeoutMs]);

  return isReady;
}
