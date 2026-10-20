import type { GeoJsonPolygon } from './types';

export type LatLng = { latitude: number; longitude: number };

/** Ray-casting point-in-polygon on the outer ring. Fine at city scale; the server re-checks with PostGIS. */
export function isInsideGeofence(point: LatLng, fence: GeoJsonPolygon): boolean {
  const ring = fence.coordinates[0];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses =
      yi > point.latitude !== yj > point.latitude &&
      point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** GeoJSON [lng, lat] ring to react-native-maps coordinates. */
export function fenceToCoords(fence: GeoJsonPolygon): LatLng[] {
  return fence.coordinates[0].map(([longitude, latitude]) => ({ latitude, longitude }));
}

export function formatDistance(metres: number): string {
  if (metres < 1) return 'You are here';
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m away`;
  return `${(metres / 1000).toFixed(1)} km away`;
}
