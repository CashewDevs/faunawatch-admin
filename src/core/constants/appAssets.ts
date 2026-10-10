/**
 * Typed static asset path constants for FaunaWatch Admin.
 *
 * Keys represent logical asset names, values represent asset path strings.
 * Views must reference asset paths via this constants object.
 */
export const AppAssets = {} as const;

export type AppAssetKey = keyof typeof AppAssets;
