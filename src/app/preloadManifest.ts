import { AppAssets } from "../core/constants/appAssets";

/** Every registered image (deduplicated), preloaded before the app is shown. */
export const preloadImageUrls: readonly string[] = [
  ...new Set(Object.values(AppAssets).flatMap((group) => Object.values(group))),
];

/**
 * Fonts to load before the app is shown. Plus Jakarta Sans is a single
 * variable font file, so one descriptor loads every weight.
 */
export const preloadFontDescriptors: readonly string[] = [
  '400 1em "Plus Jakarta Sans"',
];
