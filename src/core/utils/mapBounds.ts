/** West-south and east-north corners, as [longitude, latitude]. */
export type MapBounds = [[number, number], [number, number]];

/** The smallest area holding every point; null without points. */
export function getMapBounds(
  points: readonly { latitude: number; longitude: number }[],
): MapBounds | null {
  const [first, ...rest] = points;
  if (!first) return null;
  let west = first.longitude;
  let east = first.longitude;
  let south = first.latitude;
  let north = first.latitude;
  for (const point of rest) {
    west = Math.min(west, point.longitude);
    east = Math.max(east, point.longitude);
    south = Math.min(south, point.latitude);
    north = Math.max(north, point.latitude);
  }
  return [
    [west, south],
    [east, north],
  ];
}
